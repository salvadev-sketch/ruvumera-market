import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/stores/[username]
// Returns a store's public info plus its in-stock products, by username.
export async function GET(request, { params }) {
    try {
        const { username } = await params;

        const store = await prisma.store.findUnique({
            where: { username, isActive: true },
            include: {
                Product: {
                    where: { inStock: true },
                    include: { rating: true },
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        if (!store) {
            return NextResponse.json(
                { error: "Store not found" },
                { status: 404 }
            );
        }

        const { Product: products, ...storeInfo } = store;

        return NextResponse.json({ store: storeInfo, products });
    } catch (error) {
        console.error("GET /api/stores/[username] failed:", error);
        return NextResponse.json(
            { error: "Failed to load store" },
            { status: 500 }
        );
    }
}
