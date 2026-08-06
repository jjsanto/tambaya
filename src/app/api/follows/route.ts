import { getAuthDatabase, getRequestUser, isSameOrigin } from "@/lib/auth";

const safeReturn = (value: FormDataEntryValue | null) => {
  const path = String(value ?? "/account");
  return path.startsWith("/") && !path.startsWith("//") ? path : "/account";
};

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const [db, user, data] = await Promise.all([getAuthDatabase(), getRequestUser(request), request.formData()]);
  if (!db || !user) return new Response(null, { status: 303, headers: { Location: new URL("/login", request.url).toString() } });
  const targetType = String(data.get("targetType") ?? "");
  const targetId = String(data.get("targetId") ?? "");
  const remove = data.get("action") === "remove";
  if (targetType === "question") {
    if (remove) await db.prepare("DELETE FROM user_question_follows WHERE user_id=? AND question_id=?").bind(user.id,targetId).run();
    else await db.prepare("INSERT OR IGNORE INTO user_question_follows (user_id,question_id) SELECT ?,id FROM questions WHERE id=? AND publication_state='PUBLISHED'").bind(user.id,targetId).run();
  } else if (targetType === "category") {
    if (remove) await db.prepare("DELETE FROM user_category_follows WHERE user_id=? AND category_id=?").bind(user.id,targetId).run();
    else await db.prepare("INSERT OR IGNORE INTO user_category_follows (user_id,category_id) SELECT ?,id FROM categories WHERE id=?").bind(user.id,targetId).run();
  } else return new Response("Invalid follow target.", { status: 400 });
  return new Response(null, { status: 303, headers: { Location: new URL(safeReturn(data.get("returnTo")), request.url).toString(), "Cache-Control": "no-store" } });
}
