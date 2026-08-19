import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

async function ensureUserRow(user) {
    return prisma.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
            id: user.id,
            name: user.fullName || user.username || "User",
            email: user.emailAddresses?.[0]?.emailAddress || "",
            image: user.imageUrl || "",
        },
    });
}

// Re-validates a coupon server-side at order time — never trusts a
// discount amount computed on the client. Mirrors the checks in
// /api/coupons/apply so a coupon can't go stale between "Apply" and
// "Place Order".
async function validateCoupon(code, userId) {
    if (!code) return null;

    const normalizedCode = code.trim().toUpperCase();
    const coupon = await prisma.coupon.findUnique({ where: { code: normalizedCode } });

    if (!coupon) throw new Error("Invalid coupon code");
    if (coupon.expiresAt < new Date()) throw new Error("This coupon has expired");

    if (coupon.forNewUser) {
        const priorOrderCount = await prisma.order.count({ where: { userId } });
        if (priorOrderCount > 0) throw new Error("This coupon is only valid for new customers");
    }

    if (coupon.forMember) {
        throw new Error("This coupon requires a membership, which isn't available yet");
    }

    return coupon;
}

// Cart items come in as [{ productId, quantity }]. A multi-vendor cart can span
// several stores, so this splits it into one Order per store, each with its own
// OrderItems and total, all created in a single transaction. If a coupon is
// applied, the same percentage discount is applied to each store's subtotal.
export async function POST(request) {
    try {
        const user = await currentUser();

        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const body = await request.json();
        const { items, addressId, paymentMethod, couponCode } = body;

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
        }
        if (!addressId) {
            return NextResponse.json({ error: "addressId is required" }, { status: 400 });
        }
        if (!["COD", "STRIPE"].includes(paymentMethod)) {
            return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
        }
        if (paymentMethod === "STRIPE") {
            return NextResponse.json({ error: "Card payments aren't available yet — please use Cash on Delivery" }, { status: 400 });
        }

        await ensureUserRow(user);

        let coupon = null;
        if (couponCode) {
            try {
                coupon = await validateCoupon(couponCode, user.id);
            } catch (err) {
                return NextResponse.json({ error: err.message }, { status: 400 });
            }
        }

        const address = await prisma.address.findUnique({ where: { id: addressId } });
        if (!address || address.userId !== user.id) {
            return NextResponse.json({ error: "Address not found" }, { status: 404 });
        }

        const productIds = items.map((i) => i.productId);
        const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

        if (products.length !== productIds.length) {
            return NextResponse.json({ error: "One or more products no longer exist" }, { status: 400 });
        }

        // Group cart items by the store that owns each product
        const byStore = {};
        for (const item of items) {
            const product = products.find((p) => p.id === item.productId);
            const qty = Number(item.quantity);

            if (!qty || qty <= 0) {
                return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
            }
            if (!product.inStock) {
                return NextResponse.json({ error: `${product.name} is out of stock` }, { status: 400 });
            }

            if (!byStore[product.storeId]) byStore[product.storeId] = [];
            byStore[product.storeId].push({ product, quantity: qty });
        }

        const orders = await prisma.$transaction(
            Object.entries(byStore).map(([storeId, storeItems]) => {
                const subtotal = storeItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
                const total = coupon ? +(subtotal * (1 - coupon.discount / 100)).toFixed(2) : subtotal;

                return prisma.order.create({
                    data: {
                        userId: user.id,
                        storeId,
                        addressId,
                        total,
                        paymentMethod,
                        isCouponUsed: Boolean(coupon),
                        coupon: coupon ? { code: coupon.code, discount: coupon.discount, description: coupon.description } : {},
                        orderItems: {
                            create: storeItems.map((i) => ({
                                productId: i.product.id,
                                quantity: i.quantity,
                                price: i.product.price,
                            })),
                        },
                    },
                    include: { orderItems: { include: { product: true } }, address: true },
                });
            })
        );

        return NextResponse.json({ orders }, { status: 201 });
    } catch (error) {
        console.error("POST /api/orders failed:", error);
        return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const user = await currentUser();

        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const orders = await prisma.order.findMany({
            where: { userId: user.id },
            include: { orderItems: { include: { product: true } }, address: true },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ orders });
    } catch (error) {
        console.error("GET /api/orders failed:", error);
        return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
    }
}
