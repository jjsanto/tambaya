import { getAuthDatabase, getRequestUser, isSameOrigin } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const [db, user, data, { id }] = await Promise.all([getAuthDatabase(), getRequestUser(request), request.formData(), params]);
  if (!db || !user) return new Response(null, { status: 303, headers: { Location: new URL("/login", request.url).toString() } });
  if (data.get("action") === "update") {
    const name = String(data.get("name") ?? "").trim(); const description = String(data.get("description") ?? "").trim();
    if (name.length < 1 || name.length > 60 || description.length > 240) return new Response(null, { status: 303, headers: { Location: new URL(`/collections/${id}?error=invalid`, request.url).toString() } });
    try { await db.prepare("UPDATE user_collections SET name=?,description=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?").bind(name,description,id,user.id).run(); }
    catch { return new Response(null, { status: 303, headers: { Location: new URL(`/collections/${id}?error=duplicate`, request.url).toString() } }); }
    return new Response(null, { status: 303, headers: { Location: new URL(`/collections/${id}?updated=1`, request.url).toString(), "Cache-Control": "no-store" } });
  }
  await db.prepare("DELETE FROM user_collections WHERE id=? AND user_id=?").bind(id,user.id).run();
  return new Response(null, { status: 303, headers: { Location: new URL("/account?deleted=1", request.url).toString(), "Cache-Control": "no-store" } });
}
