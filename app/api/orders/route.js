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

// Cart items come in as [{ productId, quantity }]. A multi-vendor cart can span
// several stores, so this splits it into one Order per store, each with its own
// OrderItems and total, all created in a single transaction.
export async function POST(request) {
    try {
        const user = await currentUser();

        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const body = await request.json();
        const { items, addressId, paymentMethod } = body;

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
                const total = storeItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

                return prisma.order.create({
                    data: {
                        userId: user.id,
                        storeId,
                        addressId,
                        total,
                        paymentMethod,
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
