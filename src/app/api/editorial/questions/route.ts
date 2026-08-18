import { getCloudflareContext } from "@opennextjs/cloudflare";
import { D1QuestionRepository } from "@/data/d1-repository";
import {
  countWords,
  hasLikelyAnswerLeak,
  isAnswerStatus,
} from "@/domain/question";
import {
  editorialHeaders,
  hasEditorialAccess,
  unauthorized,
} from "@/lib/editorial-auth";
import type { CloudflareBindings } from "@/types/cloudflare";
import {evaluateQualityConsole} from "@/domain/quality-console";

type EditorialRow = {
  id: string;
  slug: string;
  question_text: string;
  publication_state: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  claimed_status: string;
  verified_status: string | null;
  verification_state: string;
  category_name: string;
  context_summary: string;
  updated_at: string;
  section_count: number;
  timeline_count: number;
  term_count: number;
  source_count: number;
  relationship_count: number;
  submission_state: string | null;
  review_notes: string | null;
  citation_count:number;
  has_pending_revision:number;
};

async function context() {
  return (await getCloudflareContext({ async: true })) as unknown as {
    env: CloudflareBindings;
  };
}

export async function GET(request: Request) {
  const { env } = await context();
  if (!(await hasEditorialAccess(request, env))) return unauthorized();
  const search = new URL(request.url).searchParams.get("q")?.trim().slice(0, 120) ?? "";
  const scope =
    new URL(request.url).searchParams.get("scope") === "archive"
      ? "archive"
      : "review";
  const where =
    scope === "review"
      ? "q.editorial_outcome IS NULL AND (q.submission_state='SUBMITTED' OR q.publication_state='DRAFT' OR q.publication_state='ARCHIVED')"
      : "q.publication_state='PUBLISHED' OR q.submission_state IS NULL";
  const searchWhere = search
    ? " AND (q.question_text LIKE ? ESCAPE '\\' COLLATE NOCASE OR q.context_summary LIKE ? ESCAPE '\\' COLLATE NOCASE OR COALESCE(c.name,q.category_name,'') LIKE ? ESCAPE '\\' COLLATE NOCASE OR q.slug LIKE ? ESCAPE '\\' COLLATE NOCASE)"
    : "";
  const searchPattern = `%${search.replace(/[\\%_]/g, value => `\\${value}`)}%`;
  const listStatement = env.DB.prepare(
    `SELECT q.id,q.slug,q.question_text,q.publication_state,q.claimed_status,q.verified_status,q.verification_state,COALESCE(c.name,q.category_name,'Uncategorised') category_name,q.context_summary,q.updated_at,
    (SELECT COUNT(*) FROM question_story_sections s WHERE s.question_id=q.id) section_count,
    (SELECT COUNT(*) FROM timeline_events t WHERE t.question_id=q.id) timeline_count,
    (SELECT COUNT(*) FROM question_key_terms k WHERE k.question_id=q.id) term_count,
    ((SELECT COUNT(*) FROM question_references r WHERE r.question_id=q.id) + (SELECT COUNT(*) FROM question_answer_attempts a WHERE a.question_id=q.id AND a.verified=1)) source_count,
    (SELECT COUNT(*) FROM question_relationships rel WHERE (rel.source_question_id=q.id OR rel.target_question_id=q.id) AND rel.verified=1) relationship_count,
    (SELECT COUNT(*) FROM source_citations sc WHERE sc.question_id=q.id AND sc.verified=1 AND sc.target_type<>'QUESTION') citation_count,
    EXISTS(SELECT 1 FROM question_revision_drafts rd WHERE rd.question_id=q.id) has_pending_revision,
    q.submission_state,q.review_notes FROM questions q LEFT JOIN categories c ON c.id=q.category_id WHERE (${where})${searchWhere} ORDER BY q.updated_at DESC`,
  );
  const [result, reviewCount] = await Promise.all([
    (search ? listStatement.bind(searchPattern,searchPattern,searchPattern,searchPattern) : listStatement).all<EditorialRow>(),
    env.DB.prepare(
      "SELECT COUNT(*) count FROM questions WHERE editorial_outcome IS NULL AND (submission_state='SUBMITTED' OR publication_state='DRAFT' OR publication_state='ARCHIVED')",
    ).first<{ count: number }>(),
  ]);
  return Response.json(
    {
      questions: (result.results ?? []).map(question=>({...question,quality:evaluateQualityConsole({contextSummary:question.context_summary,sectionCount:question.section_count,timelineCount:question.timeline_count,termCount:question.term_count,sourceCount:question.source_count,citationCount:question.citation_count,relationshipCount:question.relationship_count,verifiedStatus:question.verified_status,verificationState:question.verification_state,publicationState:question.publication_state,hasPendingRevision:Boolean(question.has_pending_revision)})})),
      scope,
      reviewCount: reviewCount?.count ?? 0,
      search,
    },
    { headers: editorialHeaders },
  );
}

export async function POST(request: Request) {
  const { env } = await context();
  if (!(await hasEditorialAccess(request, env))) return unauthorized();
  const body = request.headers.get("content-type")?.includes("application/json")
    ? ((await request.json()) as Record<string, unknown>)
    : Object.fromEntries(await request.formData());
  if (
    typeof body.questionText !== "string" ||
    body.questionText.trim().length < 10 ||
    !body.questionText.trim().endsWith("?")
  )
    return Response.json(
      { error: "Write a complete question ending in a question mark." },
      { status: 400 },
    );
  if (!isAnswerStatus(body.claimedStatus))
    return Response.json(
      { error: "Invalid answer status metadata." },
      { status: 400 },
    );
  if (
    typeof body.contextSummary !== "string" ||
    countWords(body.contextSummary) > 60 ||
    hasLikelyAnswerLeak(body.contextSummary)
  )
    return Response.json(
      {
        error:
          "Context is missing, exceeds 60 words, or may resolve the question.",
      },
      { status: 400 },
    );
  const draft = await new D1QuestionRepository(env.DB).createDraft({
    questionText: body.questionText.trim(),
    claimedStatus: body.claimedStatus,
    category: String(body.category ?? "Uncategorised"),
    contextSummary: body.contextSummary,
  });
  return Response.json(draft, { status: 201, headers: editorialHeaders });
}
