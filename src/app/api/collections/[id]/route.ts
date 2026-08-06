import { getAuthDatabase, getRequestUser, isSameOrigin } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const [db, user, { id }] = await Promise.all([getAuthDatabase(), getRequestUser(request), params]);
  if (!db || !user) return new Response(null, { status: 303, headers: { Location: new URL("/login", request.url).toString() } });
  await db.prepare("DELETE FROM user_collections WHERE id=? AND user_id=?").bind(id,user.id).run();
  return new Response(null, { status: 303, headers: { Location: new URL("/account?deleted=1", request.url).toString(), "Cache-Control": "no-store" } });
}
