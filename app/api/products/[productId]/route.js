import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/products/[productId]
// Returns a single product with its store and ratings, or 404 if not found.
export async function GET(request, { params }) {
    try {
        const { productId } = await params;

        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                store: true,
                rating: true,
            },
        });

        if (!product) {
            return NextResponse.json(
                { error: "Product not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ product });
    } catch (error) {
        console.error("GET /api/products/[productId] failed:", error);
        return NextResponse.json(
            { error: "Failed to load product" },
            { status: 500 }
        );
    }
}
