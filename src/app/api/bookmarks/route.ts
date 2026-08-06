import { getAuthDatabase, getRequestUser, isSameOrigin } from "@/lib/auth";

const safeReturn = (value: FormDataEntryValue | null) => { const path = String(value ?? "/account"); return path.startsWith("/") && !path.startsWith("//") ? path : "/account"; };

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const [db, user, data] = await Promise.all([getAuthDatabase(), getRequestUser(request), request.formData()]);
  if (!db || !user) return new Response(null, { status: 303, headers: { Location: new URL("/login", request.url).toString() } });
  const questionId = String(data.get("questionId") ?? "");
  if (data.get("action") === "remove") await db.prepare("DELETE FROM user_bookmarks WHERE user_id=? AND question_id=?").bind(user.id,questionId).run();
  else await db.prepare("INSERT OR IGNORE INTO user_bookmarks (user_id,question_id) SELECT ?,id FROM questions WHERE id=? AND publication_state='PUBLISHED'").bind(user.id,questionId).run();
  return new Response(null, { status: 303, headers: { Location: new URL(safeReturn(data.get("returnTo")), request.url).toString(), "Cache-Control": "no-store" } });
}
