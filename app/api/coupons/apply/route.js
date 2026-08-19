import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/coupons/apply
// Body: { code }
// Validates a coupon for the signed-in user and returns it if usable.
// Server-side only — the discount amount is always recomputed here and
// again at order-placement time, never trusted from the client.
export async function POST(request) {
    try {
        const user = await currentUser();

        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const body = await request.json();
        const code = (body.code || "").trim().toUpperCase();

        if (!code) {
            return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
        }

        const coupon = await prisma.coupon.findUnique({ where: { code } });

        if (!coupon) {
            return NextResponse.json({ error: "Invalid coupon code" }, { status: 404 });
        }

        if (coupon.expiresAt < new Date()) {
            return NextResponse.json({ error: "This coupon has expired" }, { status: 400 });
        }

        if (coupon.forNewUser) {
            const priorOrderCount = await prisma.order.count({ where: { userId: user.id } });
            if (priorOrderCount > 0) {
                return NextResponse.json(
                    { error: "This coupon is only valid for new customers" },
                    { status: 400 }
                );
            }
        }

        if (coupon.forMember) {
            // No membership/subscription system exists in this app yet.
            // Reject rather than silently letting anyone use a
            // member-restricted coupon.
            return NextResponse.json(
                { error: "This coupon requires a membership, which isn't available yet" },
                { status: 400 }
            );
        }

        return NextResponse.json({ coupon });
    } catch (error) {
        console.error("POST /api/coupons/apply failed:", error);
        return NextResponse.json({ error: "Failed to apply coupon" }, { status: 500 });
    }
}
