import { requireAdmin } from "@/lib/isAdmin";
import { NextResponse } from "next/server";

export async function GET() {
    const result = await requireAdmin();
    return NextResponse.json({ isAdmin: !result.error });
}
