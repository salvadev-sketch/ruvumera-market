import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const user = await currentUser();

        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const body = await request.json();
        const { name, username, description, email, contact, address, logo } = body;

        if (!name || !username || !description || !email || !contact || !address || !logo) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await prisma.user.upsert({
            where: { id: user.id },
            update: {},
            create: {
                id: user.id,
                name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Unnamed",
                email: user.emailAddresses[0]?.emailAddress ?? "",
                image: user.imageUrl ?? "",
            },
        });

        const existingStore = await prisma.store.findUnique({ where: { userId: user.id } });
        if (existingStore) {
            return NextResponse.json({ error: "You already have a store", store: existingStore }, { status: 409 });
        }

        const usernameTaken = await prisma.store.findUnique({ where: { username } });
        if (usernameTaken) {
            return NextResponse.json({ error: "That store username is already taken" }, { status: 409 });
        }

        const store = await prisma.store.create({
            data: {
                userId: user.id,
                name,
                username,
                description,
                email,
                contact,
                address,
                logo,
                status: "pending",
                isActive: false,
            },
        });

        return NextResponse.json({ store }, { status: 201 });
    } catch (error) {
        console.error("POST /api/store/create failed:", error);
        return NextResponse.json({ error: "Failed to create store" }, { status: 500 });
    }
}
