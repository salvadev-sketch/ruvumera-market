import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/store/ratings
// Returns every rating left on the signed-in store owner's products.
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

        const ratings = await prisma.rating.findMany({
            where: { product: { storeId: store.id } },
            include: { product: true, user: true },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ ratings });
    } catch (error) {
        console.error("GET /api/store/ratings failed:", error);
        return NextResponse.json({ error: "Failed to load ratings" }, { status: 500 });
    }
}
