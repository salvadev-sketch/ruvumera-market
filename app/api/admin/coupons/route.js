import { requireAdmin } from "@/lib/isAdmin";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/admin/coupons — list every coupon
export async function GET() {
    const result = await requireAdmin();
    if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const coupons = await prisma.coupon.findMany({
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ coupons });
}

// POST /api/admin/coupons — create a coupon
// Body: { code, description, discount, forNewUser, forMember, isPublic, expiresAt }
export async function POST(request) {
    const result = await requireAdmin();
    if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status });
    }

    try {
        const body = await request.json();
        const { code, description, discount, forNewUser, forMember, isPublic, expiresAt } = body;

        if (!code || !description || !discount || !expiresAt) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const discountNum = Number(discount);
        if (!Number.isFinite(discountNum) || discountNum <= 0 || discountNum > 100) {
            return NextResponse.json({ error: "Discount must be between 1 and 100" }, { status: 400 });
        }

        const expiresAtDate = new Date(expiresAt);
        if (Number.isNaN(expiresAtDate.getTime())) {
            return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 });
        }

        const normalizedCode = code.trim().toUpperCase();

        const existing = await prisma.coupon.findUnique({ where: { code: normalizedCode } });
        if (existing) {
            return NextResponse.json({ error: "A coupon with that code already exists" }, { status: 409 });
        }

        const coupon = await prisma.coupon.create({
            data: {
                code: normalizedCode,
                description,
                discount: discountNum,
                forNewUser: Boolean(forNewUser),
                forMember: Boolean(forMember),
                isPublic: Boolean(isPublic),
                expiresAt: expiresAtDate,
            },
        });

        return NextResponse.json({ coupon }, { status: 201 });
    } catch (error) {
        console.error("POST /api/admin/coupons failed:", error);
        return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
    }
}
