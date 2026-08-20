import { requireAdmin } from "@/lib/isAdmin";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/admin/dashboard
// Platform-wide stats for the admin landing page.
// "revenue" counts only DELIVERED orders — isPaid is never flipped true
// anywhere in the current order flow (no payment-confirmation step
// exists yet for COD), so it can't be used as the completed-sale signal.
export async function GET() {
    const result = await requireAdmin();
    if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status });
    }

    try {
        const [products, stores, orders, deliveredOrders, allOrders] = await Promise.all([
            prisma.product.count(),
            prisma.store.count(),
            prisma.order.count(),
            prisma.order.findMany({
                where: { status: "DELIVERED" },
                select: { total: true },
            }),
            prisma.order.findMany({
                select: { createdAt: true },
                orderBy: { createdAt: "asc" },
            }),
        ]);

        const revenue = deliveredOrders.reduce((sum, o) => sum + o.total, 0);

        return NextResponse.json({
            products,
            stores,
            orders,
            revenue,
            allOrders,
        });
    } catch (error) {
        console.error("GET /api/admin/dashboard failed:", error);
        return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
    }
}
