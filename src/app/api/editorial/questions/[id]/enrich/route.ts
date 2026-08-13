import { getCloudflareContext } from "@opennextjs/cloudflare";
import { parseEnrichmentProposal } from "@/domain/enrichment";
import { countWords, hasLikelyAnswerLeak } from "@/domain/question";
import {
  editorialHeaders,
  hasEditorialAccess,
  unauthorized,
} from "@/lib/editorial-auth";
import type { CloudflareBindings } from "@/types/cloudflare";
import { semanticCandidates } from "@/lib/semantic-relationships";

type QuestionRow = {
  question_text: string;
  context_summary: string;
  claimed_status: string;
  category_name: string;
  category_id: string;
};
type ReferenceRow = {
  title: string;
  publisher: string;
  source_url: string;
  purpose: string;
};
type CandidateRow = {
  id: string;
  slug: string;
  question_text: string;
  category_name: string;
  context_summary: string;
};

const answerAttemptSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    author: { type: "string" },
    publisher: { type: "string" },
    url: { type: "string" },
    publicationDate: { type: "string" },
    approach: { type: "string" },
    scope: { type: "string" },
    significance: { type: "string" },
    unresolved: { type: "string" },
  },
  required: [
    "title",
    "author",
    "publisher",
    "url",
    "publicationDate",
    "approach",
    "scope",
    "significance",
    "unresolved",
  ],
};

const schema = {
  type: "object",
  properties: {
    contextSummary: { type: "string", minLength: 150 },
    timeline: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          displayDate: { type: "string" },
          title: { type: "string", minLength: 4 },
          description: { type: "string", minLength: 60 },
        },
        required: ["displayDate", "title", "description"],
      },
    },
    sections: {
      type: "array",
      minItems: 5,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          key: { type: "string" },
          kicker: { type: "string" },
          title: { type: "string" },
          paragraph: { type: "string" },
          listItems: { type: "array", items: { type: "string" } },
          callout: { type: "string" },
        },
        required: [
          "key",
          "kicker",
          "title",
          "paragraph",
          "listItems",
          "callout",
        ],
      },
    },
    keyTerms: {
      type: "array",
      minItems: 0,
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          term: { type: "string", minLength: 2, maxLength: 80 },
          description: { type: "string", minLength: 80, maxLength: 400 },
        },
        required: ["term", "description"],
      },
    },
    people: {
      type: "array",
      minItems: 0,
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 3 },
          period: { type: "string", minLength: 2 },
          association: { type: "string", minLength: 60, maxLength: 500 },
        },
        required: ["name", "period", "association"],
      },
    },
    suggestedStatus: {
      type: "string",
      enum: ["OPEN", "PARTIALLY_ANSWERED", "ANSWERED"],
    },
    statusConfidence: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
    statusRationale: { type: "string" },
    sourceLeads: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          publisher: { type: "string" },
          url: { type: "string" },
          purpose: { type: "string" },
        },
        required: ["title", "publisher", "url", "purpose"],
      },
    },
    relationships: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          targetId: { type: "string" },
          targetSlug: { type: "string" },
          targetQuestion: { type: "string" },
          type: {
            type: "string",
            enum: [
              "RELATED_TO",
              "LEADS_TO",
              "DEPENDS_ON",
              "REFINES",
              "GENERALIZES",
              "CHALLENGES",
              "PRECEDES",
            ],
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          rationale: { type: "string" },
          evidenceUrl: { type: "string" },
          evidenceNote: { type: "string" },
        },
        required: [
          "targetId",
          "targetSlug",
          "targetQuestion",
          "type",
          "confidence",
          "rationale",
          "evidenceUrl",
          "evidenceNote",
        ],
      },
    },
  },
  required: [
    "contextSummary",
    "timeline",
    "sections",
    "keyTerms",
    "people",
    "suggestedStatus",
    "statusConfidence",
    "statusRationale",
    "sourceLeads",
    "relationships",
  ],
};

function unwrap(result: unknown): unknown {
  const response = (result as { response?: unknown })?.response ?? result;
  if (typeof response === "string") return JSON.parse(response);
  return response;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { env } = (await getCloudflareContext({ async: true })) as unknown as {
    env: CloudflareBindings;
  };
  if (!(await hasEditorialAccess(request, env))) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as {
    instruction?: unknown;
    contextSummary?: unknown;
    sections?: unknown;
    keyTerms?: unknown;
    people?: unknown;
    timeline?: unknown;
    answerAttempts?: unknown;
    verifiedStatus?: unknown;
  };
  const instruction = String(body.instruction ?? "")
    .trim()
    .slice(0, 1000);
  if (!env.AI)
    return Response.json(
      { error: "Workers AI is not configured for this deployment." },
      { status: 503, headers: editorialHeaders },
    );
  const { id } = await params;
  const [question, references, candidatesResult] = await Promise.all([
    env.DB.prepare(
      "SELECT question_text,context_summary,claimed_status,category_name,category_id FROM questions WHERE id=?",
    )
      .bind(id)
      .first<QuestionRow>(),
    env.DB.prepare(
      "SELECT title,COALESCE(publisher,'') publisher,source_url,purpose FROM question_references WHERE question_id=? ORDER BY position LIMIT 12",
    )
      .bind(id)
      .all<ReferenceRow>(),
    env.DB.prepare(
      "SELECT id,slug,question_text,category_name,substr(context_summary,1,300) context_summary FROM questions WHERE id<>? AND publication_state='PUBLISHED' ORDER BY CASE WHEN category_name=(SELECT category_name FROM questions WHERE id=?) THEN 0 ELSE 1 END,published_at DESC LIMIT 30",
    )
      .bind(id, id)
      .all<CandidateRow>(),
  ]);
  if (!question)
    return Response.json(
      { error: "Question not found." },
      { status: 404, headers: editorialHeaders },
    );
  const semantic = await semanticCandidates(env,{
    id,
    questionText:question.question_text,
    contextSummary:String(body.contextSummary??question.context_summary),
    categoryId:question.category_id,
    category:question.category_name,
  }).catch(()=>[]);
  const relationshipCandidates = semantic.length ? semantic.map(candidate=>({
    id:candidate.id,slug:candidate.slug,question_text:candidate.questionText,
    category_name:candidate.category,context_summary:"",semanticScore:candidate.semanticScore,
    crossCategory:candidate.crossCategory,rankingScore:candidate.rankingScore,
  })) : (candidatesResult.results??[]);
  const workingStatus = ["OPEN", "PARTIALLY_ANSWERED", "ANSWERED"].includes(
    String(body.verifiedStatus),
  )
    ? String(body.verifiedStatus)
    : question.claimed_status;
  if (
    instruction &&
    /context\s+summary|summary\s+for|write\s+(?:the\s+)?context/i.test(
      instruction,
    )
  ) {
    try {
      const result = await env.AI.run(
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        {
          messages: [
            {
              role: "system",
              content:
                "You are a cautious encyclopedic editor. Describe a question's history, framing, vocabulary, and significance without answering it.",
            },
            {
              role: "user",
              content: `Question: ${question.question_text}\nCategory: ${question.category_name}\nCurrent context: ${String(body.contextSummary ?? question.context_summary)}\nEditorial request: ${instruction}\nWrite a concise 45–60 word context summary. Do not answer the question. Return only JSON.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              type: "object",
              properties: {
                contextSummary: { type: "string", minLength: 150 },
              },
              required: ["contextSummary"],
            },
          },
          max_tokens: 1200,
        },
      );
      const raw = unwrap(result) as Record<string, unknown>;
      const contextSummary = String(raw.contextSummary ?? "").trim();
      if (
        contextSummary.length < 150 ||
        countWords(contextSummary) > 60 ||
        hasLikelyAnswerLeak(contextSummary)
      )
        throw new Error(
          "The generated summary was too short or may answer the question.",
        );
      return Response.json({ contextSummary }, { headers: editorialHeaders });
    } catch (error) {
      return Response.json(
        {
          error: `The context-summary proposal was rejected safely: ${error instanceof Error ? error.message : "Invalid response"}`,
        },
        { status: 422, headers: editorialHeaders },
      );
    }
  }
  const prompt = `Create a private editorial enrichment proposal for Tambaya, a platform that publishes questions but NEVER answers them.

Question: ${question.question_text}
Category: ${question.category_name}
Current editorial answer status: ${workingStatus}
Existing context: ${question.context_summary}
Existing source records: ${JSON.stringify(references.results ?? [])}
Current unsaved working copy: ${JSON.stringify({ contextSummary: body.contextSummary, timeline: body.timeline, answerAttempts: body.answerAttempts, keyTerms: body.keyTerms, people: body.people, sections: body.sections })}
Editorial change request: ${instruction || "Create a comprehensive general enrichment."}
Cross-disciplinary relationship candidates: ${JSON.stringify(relationshipCandidates)}

Write a concise 45–60 word context summary, a chronological 3–6 event timeline showing how the asking changed, and 5–6 encyclopedic Story sections about the question's origins, changing vocabulary, history of inquiry, significance, appearances across fields, methodological difficulties, and lines of further inquiry. Timeline displayDate values may be a year, period, or era; each event must identify a genuine change in framing, vocabulary, audience, or method rather than an alleged answer. Each section paragraph must contain 90–140 words. Explain the QUESTION and its history; do not state, imply, or summarize an answer. Never use phrases such as “the answer is”, “this proves”, or “therefore the answer”. The summary, timeline, lists, and callouts must also remain contextual.

Propose 0–8 key terms only when they genuinely clarify this particular question. Each description must define the term concretely in 25–55 words and explain why that precise meaning changes the framing of this question. Never describe a term merely as “recurring”, “central”, “important”, or as something whose meaning “varies across contexts”. A description must not be reusable unchanged for another term or question. Return an empty keyTerms array when useful definitions cannot be supplied.
Propose 0–8 real people whose documented work materially shaped how this exact question was framed, investigated, or debated. Give a concise life/active period and at least 60 characters explaining the specific association without stating an answer. Do not include merely famous people with a weak connection.

Suggest an answer-status classification only as metadata about whether sufficiently established answers exist outside Tambaya. The rationale must describe verification scope and uncertainty without disclosing any answer. Treat statusConfidence as LOW unless the supplied source records support a stronger assessment. Source leads must be credible HTTPS references for an editor to verify; never fabricate article titles or URLs.

Also propose up to 8 meaningful outbound relationships in the form “this question RELATIONSHIP_TYPE candidate question”. Use only IDs, slugs, and exact question titles from Cross-disciplinary relationship candidates. Prefer revealing bridges across disciplines when they are substantively defensible; do not force weak connections. Give each a 0–1 confidence, a concise rationale, an evidenceNote explaining the conceptual basis, and an evidenceUrl only when an existing credible source supports the edge (otherwise empty). Return an empty relationships array if none are defensible. Return only the requested JSON.`;
  try {
    const [storyResult, attemptResult] = await Promise.allSettled([
      env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        messages: [
          {
            role: "system",
            content:
              "You are a cautious encyclopedic editor. You describe the history and shape of questions without answering them.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_schema", json_schema: schema },
        max_tokens: 4800,
      }),
      env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        messages: [
          {
            role: "system",
            content:
              "You are a bibliographic research assistant. Identify genuine works without inventing citations or disclosing their conclusions.",
          },
          {
            role: "user",
            content: `Question: ${question.question_text}\nStatus: ${workingStatus}\nIdentify one genuine historically significant published work that attempted to answer or materially investigate this question. Describe only its approach, scope, significance, and what remained unresolved. Do not reveal its conclusion. Use an empty URL if a canonical HTTPS page is uncertain. Return one candidate as JSON.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            type: "object",
            properties: { answerAttempt: answerAttemptSchema },
            required: ["answerAttempt"],
          },
        },
        max_tokens: 1400,
      }),
    ]);
    if (storyResult.status === "rejected") throw storyResult.reason;
    const rawProposal = unwrap(storyResult.value) as Record<string, unknown>;
    rawProposal.answerAttempts = [];
    if (workingStatus !== "ANSWERED" && attemptResult.status === "fulfilled") {
      const attempt = unwrap(attemptResult.value) as Record<string, unknown>;
      rawProposal.answerAttempts = [attempt.answerAttempt];
    }
    const proposal = parseEnrichmentProposal(rawProposal);
    if (proposal.answerAttempts.length === 0) {
      const existingReference = (references.results ?? [])[0];
      const sourceLead = proposal.sourceLeads[0];
      const candidate = existingReference
        ? {
            title: existingReference.title,
            publisher: existingReference.publisher,
            url: existingReference.source_url,
          }
        : sourceLead
          ? {
              title: sourceLead.title,
              publisher: sourceLead.publisher,
              url: sourceLead.url,
            }
          : null;
      if (candidate) {
        proposal.answerAttempts.push({
          title: candidate.title,
          author: "",
          publisher: candidate.publisher,
          url: candidate.url,
          publicationDate: "",
          approach: "",
          scope: "",
          significance: "",
          unresolved: "",
        });
        proposal.warnings.push(
          `“${candidate.title}” was recovered from the question's existing references because AI returned no usable answer attempt. Verify whether it is genuinely an answer attempt and complete every editorial field before approval.`,
        );
      }
    }
    const candidates = new Map(
      relationshipCandidates.map((candidate) => [
        candidate.id,
        candidate,
      ]),
    );
    proposal.relationships = proposal.relationships.flatMap((relationship) => {
      const candidate = candidates.get(relationship.targetId);
      return candidate &&
        candidate.slug === relationship.targetSlug &&
        candidate.question_text === relationship.targetQuestion
        ? [relationship]
        : [];
    });
    console.log(
      JSON.stringify({
        event: "editorial_enrichment_result",
        questionId: id,
        workingStatus,
        rawAnswerAttemptCount: Array.isArray(rawProposal.answerAttempts)
          ? rawProposal.answerAttempts.length
          : -1,
        finalAnswerAttemptCount: proposal.answerAttempts.length,
        existingReferenceCount: (references.results ?? []).length,
      }),
    );
    return Response.json({ proposal }, { headers: editorialHeaders });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unknown model response";
    console.error(
      JSON.stringify({
        event: "editorial_enrichment_rejected",
        questionId: id,
        workingStatus,
        detail,
      }),
    );
    return Response.json(
      { error: `The enrichment proposal was rejected safely: ${detail}` },
      { status: 422, headers: editorialHeaders },
    );
  }
}
