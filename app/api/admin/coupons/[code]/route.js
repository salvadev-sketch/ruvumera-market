import { requireAdmin } from "@/lib/isAdmin";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// DELETE /api/admin/coupons/[code]
export async function DELETE(request, { params }) {
    const result = await requireAdmin();
    if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status });
    }

    try {
        const { code } = await params;
        const normalizedCode = code.trim().toUpperCase();

        const existing = await prisma.coupon.findUnique({ where: { code: normalizedCode } });
        if (!existing) {
            return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
        }

        await prisma.coupon.delete({ where: { code: normalizedCode } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/admin/coupons/[code] failed:", error);
        return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
    }
}
