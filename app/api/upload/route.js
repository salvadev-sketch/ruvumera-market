import { currentUser } from "@clerk/nextjs/server";
import cloudinary from "@/lib/cloudinary";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const user = await currentUser();

        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file");

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!file.type || !file.type.startsWith("image/")) {
            return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
        }

        const MAX_BYTES = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_BYTES) {
            return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: "ruvumera-market", resource_type: "image" },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(buffer);
        });

        return NextResponse.json({ url: uploadResult.secure_url });
    } catch (error) {
        console.error("POST /api/upload failed:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
