import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/rating
// Body: { orderId, productId, rating, review }
// Creates or updates the current user's rating for a product they
// actually bought — only allowed once the order has been delivered.
export async function POST(request) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const body = await request.json();
        const { orderId, productId, rating, review } = body;

        if (!orderId || !productId) {
            return NextResponse.json({ error: "orderId and productId are required" }, { status: 400 });
        }

        const ratingNum = Number(rating);
        if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return NextResponse.json({ error: "Rating must be a whole number between 1 and 5" }, { status: 400 });
        }

        if (!review || review.trim().length < 5) {
            return NextResponse.json({ error: "Please write a short review (at least 5 characters)" }, { status: 400 });
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { orderItems: true },
        });

        if (!order || order.userId !== user.id) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        if (order.status !== "DELIVERED") {
            return NextResponse.json({ error: "You can only rate products after delivery" }, { status: 400 });
        }

        const boughtThisProduct = order.orderItems.some((item) => item.productId === productId);
        if (!boughtThisProduct) {
            return NextResponse.json({ error: "This product wasn't part of that order" }, { status: 400 });
        }

        const savedRating = await prisma.rating.upsert({
            where: {
                userId_productId_orderId: {
                    userId: user.id,
                    productId,
                    orderId,
                },
            },
            update: {
                rating: ratingNum,
                review: review.trim(),
            },
            create: {
                userId: user.id,
                productId,
                orderId,
                rating: ratingNum,
                review: review.trim(),
            },
        });

        return NextResponse.json({ rating: savedRating }, { status: 201 });
    } catch (error) {
        console.error("POST /api/rating failed:", error);
        return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
    }
}

// GET /api/rating
// Returns the current user's own ratings, used to hydrate the "already
// rated" state on the orders page.
export async function GET() {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const ratings = await prisma.rating.findMany({
            where: { userId: user.id },
        });

        return NextResponse.json({ ratings });
    } catch (error) {
        console.error("GET /api/rating failed:", error);
        return NextResponse.json({ error: "Failed to load ratings" }, { status: 500 });
    }
}
