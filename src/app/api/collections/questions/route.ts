import { getAuthDatabase, getRequestUser, isSameOrigin } from "@/lib/auth";

const safeReturn = (value: FormDataEntryValue | null) => { const path = String(value ?? "/account"); return path.startsWith("/") && !path.startsWith("//") ? path : "/account"; };

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const [db,user,data] = await Promise.all([getAuthDatabase(),getRequestUser(request),request.formData()]);
  if (!db || !user) return new Response(null, { status: 303, headers: { Location: new URL("/login", request.url).toString() } });
  const collectionId = String(data.get("collectionId") ?? "");
  const questionId = String(data.get("questionId") ?? "");
  await db.prepare("INSERT OR IGNORE INTO user_collection_questions (collection_id,question_id) SELECT c.id,q.id FROM user_collections c JOIN questions q ON q.id=? AND q.publication_state='PUBLISHED' WHERE c.id=? AND c.user_id=?").bind(questionId,collectionId,user.id).run();
  await db.prepare("UPDATE user_collections SET updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?").bind(collectionId,user.id).run();
  return new Response(null, { status: 303, headers: { Location: new URL(safeReturn(data.get("returnTo")), request.url).toString(), "Cache-Control": "no-store" } });
}
