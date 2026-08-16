import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const user = await currentUser();

        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const store = await prisma.store.findUnique({
            where: { userId: user.id },
        });

        if (!store) {
            return NextResponse.json({ hasStore: false });
        }

        return NextResponse.json({
            hasStore: true,
            status: store.status,
            isActive: store.isActive,
            store,
        });
    } catch (error) {
        console.error("GET /api/store/status failed:", error);
        return NextResponse.json({ error: "Failed to check store status" }, { status: 500 });
    }
}
