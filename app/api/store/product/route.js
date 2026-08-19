import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Shared helper: confirm the signed-in Clerk user owns an approved-or-pending store.
// Returns { error, status } on failure, or { user, store } on success.
async function requireStoreOwner() {
    const user = await currentUser();

    if (!user) {
        return { error: "Not authenticated", status: 401 };
    }

    const store = await prisma.store.findUnique({ where: { userId: user.id } });

    if (!store) {
        return { error: "You don't have a store yet", status: 403 };
    }

    return { user, store };
}

export async function POST(request) {
    try {
        const result = await requireStoreOwner();
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const { store } = result;

        const body = await request.json();
        const { name, description, mrp, price, images, category } = body;

        if (!name || !description || mrp === undefined || price === undefined || !category) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const mrpNum = Number(mrp);
        const priceNum = Number(price);

        if (Number.isNaN(mrpNum) || Number.isNaN(priceNum) || mrpNum <= 0 || priceNum <= 0) {
            return NextResponse.json({ error: "Price and MRP must be positive numbers" }, { status: 400 });
        }

        if (priceNum > mrpNum) {
            return NextResponse.json({ error: "Offer price cannot be higher than the actual price" }, { status: 400 });
        }

        const imageList = Array.isArray(images) ? images.filter(Boolean) : [];
        if (imageList.length === 0) {
            return NextResponse.json({ error: "At least one image URL is required" }, { status: 400 });
        }

        const product = await prisma.product.create({
            data: {
                name,
                description,
                mrp: mrpNum,
                price: priceNum,
                images: imageList,
                category,
                storeId: store.id,
            },
        });

        return NextResponse.json({ product }, { status: 201 });
    } catch (error) {
        console.error("POST /api/store/product failed:", error);
        return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const result = await requireStoreOwner();
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const { store } = result;

        const products = await prisma.product.findMany({
            where: { storeId: store.id },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ products });
    } catch (error) {
        console.error("GET /api/store/product failed:", error);
        return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
    }
}
