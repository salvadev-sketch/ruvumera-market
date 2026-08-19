import { currentUser } from "@clerk/nextjs/server";

// Simple env-var allowlist — no schema migration required. Set ADMIN_EMAILS
// in .env (and on Vercel) as a comma-separated list, e.g.
// ADMIN_EMAILS=owner@example.com,manager@example.com
export async function requireAdmin() {
    const user = await currentUser();
    if (!user) return { error: "Not authenticated", status: 401 };

    const adminEmails = (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

    const userEmails = (user.emailAddresses || []).map((e) => e.emailAddress.toLowerCase());
    const isAdmin = userEmails.some((email) => adminEmails.includes(email));

    if (!isAdmin) return { error: "Not authorized", status: 403 };

    return { user };
}
