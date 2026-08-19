import { requireAdmin } from "@/lib/isAdmin";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
    const result = await requireAdmin();
    if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status });
    }

    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status"); // e.g. "pending" or "approved"

        const stores = await prisma.store.findMany({
            where: status ? { status } : undefined,
            include: { user: true },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ stores });
    } catch (error) {
        console.error("GET /api/admin/stores failed:", error);
        return NextResponse.json({ error: "Failed to load stores" }, { status: 500 });
    }
}

const VALID_STATUSES = ["pending", "approved", "rejected"];

export async function PATCH(request) {
    const result = await requireAdmin();
    if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status });
    }

    try {
        const body = await request.json();
        const { storeId, status, isActive } = body;

        if (!storeId) {
            return NextResponse.json({ error: "storeId is required" }, { status: 400 });
        }

        const data = {};

        if (status !== undefined) {
            if (!VALID_STATUSES.includes(status)) {
                return NextResponse.json({ error: "Invalid status" }, { status: 400 });
            }
            data.status = status;
            // Approving a store also activates it; rejecting deactivates it.
            data.isActive = status === "approved";
        }

        if (isActive !== undefined) {
            data.isActive = Boolean(isActive);
        }

        if (Object.keys(data).length === 0) {
            return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
        }

        const store = await prisma.store.update({
            where: { id: storeId },
            data,
            include: { user: true },
        });

        return NextResponse.json({ store });
    } catch (error) {
        console.error("PATCH /api/admin/stores failed:", error);
        return NextResponse.json({ error: "Failed to update store" }, { status: 500 });
    }
}
