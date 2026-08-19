import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Ensure a User row exists for this Clerk user (some flows, like a buyer who
// never created a store, may not have upserted one yet).
async function ensureUserRow(user) {
    return prisma.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
            id: user.id,
            name: user.fullName || user.username || "User",
            email: user.emailAddresses?.[0]?.emailAddress || "",
            image: user.imageUrl || "",
        },
    });
}

export async function POST(request) {
    try {
        const user = await currentUser();

        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const body = await request.json();
        const { name, email, street, city, state, zip, country, phone } = body;

        if (!name || !email || !street || !city || !state || !zip || !country || !phone) {
            return NextResponse.json({ error: "All address fields are required" }, { status: 400 });
        }

        await ensureUserRow(user);

        const address = await prisma.address.create({
            data: { userId: user.id, name, email, street, city, state, zip, country, phone },
        });

        return NextResponse.json({ address }, { status: 201 });
    } catch (error) {
        console.error("POST /api/user/address failed:", error);
        return NextResponse.json({ error: "Failed to save address" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const user = await currentUser();

        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const addresses = await prisma.address.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ addresses });
    } catch (error) {
        console.error("GET /api/user/address failed:", error);
        return NextResponse.json({ error: "Failed to load addresses" }, { status: 500 });
    }
}
