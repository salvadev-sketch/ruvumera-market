import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

async function requireStoreOwner() {
    const user = await currentUser();
    if (!user) return { error: "Not authenticated", status: 401 };

    const store = await prisma.store.findUnique({ where: { userId: user.id } });
    if (!store) return { error: "You don't have a store yet", status: 403 };

    return { user, store };
}

export async function GET() {
    try {
        const result = await requireStoreOwner();
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const { store } = result;

        const orders = await prisma.order.findMany({
            where: { storeId: store.id },
            include: {
                orderItems: { include: { product: true } },
                address: true,
                user: true,
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ orders });
    } catch (error) {
        console.error("GET /api/store/orders failed:", error);
        return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
    }
}

const VALID_STATUSES = ["ORDER_PLACED", "PROCESSING", "SHIPPED", "DELIVERED"];

export async function PATCH(request) {
    try {
        const result = await requireStoreOwner();
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const { store } = result;

        const { orderId, status } = await request.json();

        if (!orderId || !VALID_STATUSES.includes(status)) {
            return NextResponse.json({ error: "Invalid orderId or status" }, { status: 400 });
        }

        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order || order.storeId !== store.id) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const updated = await prisma.order.update({
            where: { id: orderId },
            data: { status },
            include: { orderItems: { include: { product: true } }, address: true, user: true },
        });

        return NextResponse.json({ order: updated });
    } catch (error) {
        console.error("PATCH /api/store/orders failed:", error);
        return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }
}
