import { getAuthDatabase, getRequestUser, isSameOrigin } from "@/lib/auth";

const safeReturn = (value: FormDataEntryValue | null) => {
  const path = String(value ?? "/account");
  return path.startsWith("/") && !path.startsWith("//") ? path : "/account";
};

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const [db, user, data] = await Promise.all([getAuthDatabase(), getRequestUser(request), request.formData()]);
  if (!db || !user) return new Response(null, { status: 303, headers: { Location: new URL("/login", request.url).toString() } });
  const questionId = String(data.get("questionId") ?? "");
  const rating = Number(data.get("rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return new Response("Choose a rating from 1 to 5.", { status: 400 });
  await db.prepare("INSERT INTO question_ratings (user_id,question_id,rating) SELECT ?,id,? FROM questions WHERE id=? AND publication_state='PUBLISHED' ON CONFLICT(user_id,question_id) DO UPDATE SET rating=excluded.rating,updated_at=CURRENT_TIMESTAMP").bind(user.id, rating, questionId).run();
  return new Response(null, { status: 303, headers: { Location: new URL(safeReturn(data.get("returnTo")), request.url).toString(), "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const [db, user, body] = await Promise.all([getAuthDatabase(), getRequestUser(request), request.json() as Promise<{ questionId?: string }>]);
  if (!db || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await db.prepare("DELETE FROM question_ratings WHERE user_id=? AND question_id=?").bind(user.id, String(body.questionId ?? "")).run();
  return Response.json({ removed: true });
}
