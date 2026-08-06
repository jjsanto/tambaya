import { getAuthDatabase, getRequestUser, isSameOrigin } from "@/lib/auth";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const [db, user, data] = await Promise.all([getAuthDatabase(), getRequestUser(request), request.formData()]);
  if (!db || !user) return new Response(null, { status: 303, headers: { Location: new URL("/login", request.url).toString() } });
  const name = String(data.get("name") ?? "").trim();
  const description = String(data.get("description") ?? "").trim();
  if (name.length < 1 || name.length > 60 || description.length > 240) return new Response(null, { status: 303, headers: { Location: new URL("/account?error=collection", request.url).toString() } });
  try { await db.prepare("INSERT INTO user_collections (id,user_id,name,description) VALUES (?,?,?,?)").bind(crypto.randomUUID(),user.id,name,description).run(); }
  catch { return new Response(null, { status: 303, headers: { Location: new URL("/account?error=duplicate", request.url).toString() } }); }
  return new Response(null, { status: 303, headers: { Location: new URL("/account?created=1", request.url).toString(), "Cache-Control": "no-store" } });
}
