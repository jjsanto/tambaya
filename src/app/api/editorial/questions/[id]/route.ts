import { getCloudflareContext } from "@opennextjs/cloudflare";
import { hasLikelyAnswerLeak, isAnswerStatus } from "@/domain/question";
import { hasEditorialAccess, unauthorized } from "@/lib/editorial-auth";
import type { CloudflareBindings } from "@/types/cloudflare";

type DraftRow = { id: string; question_text: string; context_summary: string; publication_state: string };

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await getCloudflareContext({ async: true }) as unknown as { env: CloudflareBindings };
  if (!await hasEditorialAccess(request, env)) return unauthorized();
  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;
  const draft = await env.DB.prepare("SELECT id,question_text,context_summary,publication_state FROM questions WHERE id=?").bind(id).first<DraftRow>();
  if (!draft) return Response.json({ error: "Question not found." }, { status: 404 });
  if (body.action !== "publish") return Response.json({ error: "Unsupported editorial action." }, { status: 400 });
  if (draft.publication_state !== "DRAFT") return Response.json({ error: "Only drafts can be published." }, { status: 409 });
  if (!isAnswerStatus(body.verifiedStatus)) return Response.json({ error: "Choose a verified status before publishing." }, { status: 400 });
  if (draft.context_summary.trim().length < 150 || hasLikelyAnswerLeak(draft.context_summary)) return Response.json({ error: "The context summary must contain at least 150 characters and remain answer-free." }, { status: 400 });
  await env.DB.batch([
    env.DB.prepare("UPDATE question_content_sections SET publication_state='PUBLISHED',answer_leak_state='PASSED',reviewed_by='EDITORIAL',reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE question_id=? AND section_type='SUMMARY'").bind(id),
    env.DB.prepare("UPDATE questions SET publication_state='PUBLISHED',verified_status=?,verification_state='VERIFIED',last_verified_at=CURRENT_TIMESTAMP,published_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(body.verifiedStatus,id),
  ]);
  return Response.json({ id, publicationState: "PUBLISHED" });
}
