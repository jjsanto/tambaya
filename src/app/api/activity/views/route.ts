import { getAuthDatabase, getRequestUser, isSameOrigin } from "@/lib/auth";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const [db, user, body] = await Promise.all([getAuthDatabase(), getRequestUser(request), request.json() as Promise<{ questionId?: string }>]);
  if (!db || !user) return Response.json({ tracked: false }, { status: 401 });
  const questionId = String(body.questionId ?? "");
  await db.prepare("INSERT INTO user_question_views (user_id,question_id) SELECT ?,id FROM questions WHERE id=? AND publication_state='PUBLISHED' ON CONFLICT(user_id,question_id) DO UPDATE SET view_count=view_count+1,last_viewed_at=CURRENT_TIMESTAMP").bind(user.id,questionId).run();
  return Response.json({ tracked: true }, { headers: { "Cache-Control": "private, no-store" } });
}
