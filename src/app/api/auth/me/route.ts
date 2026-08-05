import { getCurrentUser } from "@/lib/auth";

export async function GET() { return Response.json({ user: await getCurrentUser() }, { headers: { "Cache-Control": "private, no-store" } }); }
