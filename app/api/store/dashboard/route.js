import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/store/dashboard
// Stats + reviews for the signed-in store owner's dashboard page.
// "totalEarnings" counts only this store's DELIVERED orders — same
// reasoning as the admin dashboard (isPaid is never set true anywhere
// in the current COD-only flow).
export async function GET() {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const store = await prisma.store.findUnique({ where: { userId: user.id } });
        if (!store) {
            return NextResponse.json({ error: "You don't have a store yet" }, { status: 403 });
        }

        const [totalProducts, totalOrders, deliveredOrders, ratings] = await Promise.all([
            prisma.product.count({ where: { storeId: store.id } }),
            prisma.order.count({ where: { storeId: store.id } }),
            prisma.order.findMany({
                where: { storeId: store.id, status: "DELIVERED" },
                select: { total: true },
            }),
            prisma.rating.findMany({
                where: { product: { storeId: store.id } },
                include: { product: true, user: true },
                orderBy: { createdAt: "desc" },
            }),
        ]);

        const totalEarnings = deliveredOrders.reduce((sum, o) => sum + o.total, 0);

        return NextResponse.json({
            totalProducts,
            totalOrders,
            totalEarnings,
            ratings,
        });
    } catch (error) {
        console.error("GET /api/store/dashboard failed:", error);
        return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
    }
}
