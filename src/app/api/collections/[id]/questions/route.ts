import { getAuthDatabase, getRequestUser, isSameOrigin } from "@/lib/auth";

const safeReturn = (value: FormDataEntryValue | null) => { const path = String(value ?? "/account"); return path.startsWith("/") && !path.startsWith("//") ? path : "/account"; };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const [db, user, data, { id }] = await Promise.all([getAuthDatabase(), getRequestUser(request), request.formData(), params]);
  if (!db || !user) return new Response(null, { status: 303, headers: { Location: new URL("/login", request.url).toString() } });
  const questionId = String(data.get("questionId") ?? "");
  if (data.get("action") === "remove") await db.prepare("DELETE FROM user_collection_questions WHERE collection_id=? AND question_id=? AND collection_id IN (SELECT id FROM user_collections WHERE user_id=?)").bind(id,questionId,user.id).run();
  else await db.prepare("INSERT OR IGNORE INTO user_collection_questions (collection_id,question_id) SELECT c.id,q.id FROM user_collections c JOIN questions q ON q.id=? AND q.publication_state='PUBLISHED' WHERE c.id=? AND c.user_id=?").bind(questionId,id,user.id).run();
  await db.prepare("UPDATE user_collections SET updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?").bind(id,user.id).run();
  return new Response(null, { status: 303, headers: { Location: new URL(safeReturn(data.get("returnTo")), request.url).toString(), "Cache-Control": "no-store" } });
}
