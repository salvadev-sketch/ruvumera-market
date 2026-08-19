import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(request) {
    try {
        const user = await currentUser();

        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const { productId } = await request.json();

        if (!productId) {
            return NextResponse.json({ error: "productId is required" }, { status: 400 });
        }

        const store = await prisma.store.findUnique({ where: { userId: user.id } });

        if (!store) {
            return NextResponse.json({ error: "You don't have a store yet" }, { status: 403 });
        }

        const product = await prisma.product.findUnique({ where: { id: productId } });

        if (!product || product.storeId !== store.id) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        const updated = await prisma.product.update({
            where: { id: productId },
            data: { inStock: !product.inStock },
        });

        return NextResponse.json({ product: updated });
    } catch (error) {
        console.error("PATCH /api/store/product/toggle-stock failed:", error);
        return NextResponse.json({ error: "Failed to update stock status" }, { status: 500 });
    }
}
