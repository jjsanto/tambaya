import { getCloudflareContext } from "@opennextjs/cloudflare";
import { D1QuestionRepository } from "@/data/d1-repository";
import { hasLikelyAnswerLeak, isAnswerStatus } from "@/domain/question";
import { editorialHeaders, hasEditorialAccess, unauthorized } from "@/lib/editorial-auth";
import type { CloudflareBindings } from "@/types/cloudflare";

type EditorialRow = { id: string; slug: string; question_text: string; publication_state: "DRAFT" | "PUBLISHED" | "ARCHIVED"; claimed_status: string; verified_status: string | null; verification_state: string; category_name: string; context_summary: string; updated_at: string; section_count: number; submission_state: string | null; review_notes: string | null };

async function context() {
  return await getCloudflareContext({ async: true }) as unknown as { env: CloudflareBindings };
}

export async function GET(request: Request) {
  const { env } = await context();
  if (!await hasEditorialAccess(request, env)) return unauthorized();
  const scope=new URL(request.url).searchParams.get("scope")==="archive"?"archive":"review";
  const where=scope==="review"?"q.submission_state='SUBMITTED'":"q.publication_state='PUBLISHED' OR q.submission_state IS NULL";
  const [result,reviewCount]=await Promise.all([env.DB.prepare(`SELECT q.id,q.slug,q.question_text,q.publication_state,q.claimed_status,q.verified_status,q.verification_state,COALESCE(c.name,q.category_name,'Uncategorised') category_name,q.context_summary,q.updated_at,(SELECT COUNT(*) FROM question_story_sections s WHERE s.question_id=q.id) section_count,q.submission_state,q.review_notes FROM questions q LEFT JOIN categories c ON c.id=q.category_id WHERE ${where} ORDER BY q.updated_at DESC`).all<EditorialRow>(),env.DB.prepare("SELECT COUNT(*) count FROM questions WHERE submission_state='SUBMITTED'").first<{count:number}>()]);
  return Response.json({ questions: result.results ?? [],scope,reviewCount:reviewCount?.count??0 }, { headers: editorialHeaders });
}

export async function POST(request: Request) {
  const { env } = await context();
  if (!await hasEditorialAccess(request, env)) return unauthorized();
  const body = request.headers.get("content-type")?.includes("application/json")
    ? await request.json() as Record<string, unknown>
    : Object.fromEntries(await request.formData());
  if (typeof body.questionText !== "string" || body.questionText.trim().length < 10 || !body.questionText.trim().endsWith("?")) return Response.json({ error: "Write a complete question ending in a question mark." }, { status: 400 });
  if (!isAnswerStatus(body.claimedStatus)) return Response.json({ error: "Invalid answer status metadata." }, { status: 400 });
  if (typeof body.contextSummary !== "string" || hasLikelyAnswerLeak(body.contextSummary)) return Response.json({ error: "Context is missing or may resolve the question." }, { status: 400 });
  const draft = await new D1QuestionRepository(env.DB).createDraft({ questionText: body.questionText.trim(), claimedStatus: body.claimedStatus, category: String(body.category ?? "Uncategorised"), contextSummary: body.contextSummary });
  return Response.json(draft, { status: 201, headers: editorialHeaders });
}
