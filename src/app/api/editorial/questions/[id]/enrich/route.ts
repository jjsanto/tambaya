import { getCloudflareContext } from "@opennextjs/cloudflare";
import { parseEnrichmentProposal } from "@/domain/enrichment";
import { hasLikelyAnswerLeak } from "@/domain/question";
import {
  editorialHeaders,
  hasEditorialAccess,
  unauthorized,
} from "@/lib/editorial-auth";
import type { CloudflareBindings } from "@/types/cloudflare";

type QuestionRow = {
  question_text: string;
  context_summary: string;
  claimed_status: string;
  category_name: string;
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

const schema = {
  type: "object",
  properties: {
    contextSummary: { type: "string", minLength: 150 },
    sections: {
      type: "array",
      minItems: 5,
      maxItems: 8,
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
    suggestedStatus: {
      type: "string",
      enum: ["OPEN", "PARTIALLY_ANSWERED", "ANSWERED"],
    },
    statusConfidence: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
    statusRationale: { type: "string" },
    sourceLeads: {
      type: "array",
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
        },
        required: [
          "targetId",
          "targetSlug",
          "targetQuestion",
          "type",
          "confidence",
          "rationale",
        ],
      },
    },
  },
  required: [
    "contextSummary",
    "sections",
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
      "SELECT question_text,context_summary,claimed_status,category_name FROM questions WHERE id=?",
    )
      .bind(id)
      .first<QuestionRow>(),
    env.DB.prepare(
      "SELECT title,COALESCE(publisher,'') publisher,source_url,purpose FROM question_references WHERE question_id=? ORDER BY position LIMIT 12",
    )
      .bind(id)
      .all<ReferenceRow>(),
    env.DB.prepare(
      "SELECT id,slug,question_text,category_name,substr(context_summary,1,500) context_summary FROM questions WHERE id<>? AND publication_state='PUBLISHED' ORDER BY CASE WHEN category_name=(SELECT category_name FROM questions WHERE id=?) THEN 0 ELSE 1 END,published_at DESC LIMIT 60",
    )
      .bind(id, id)
      .all<CandidateRow>(),
  ]);
  if (!question)
    return Response.json(
      { error: "Question not found." },
      { status: 404, headers: editorialHeaders },
    );
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
              content: `Question: ${question.question_text}\nCategory: ${question.category_name}\nCurrent context: ${String(body.contextSummary ?? question.context_summary)}\nEditorial request: ${instruction}\nWrite a 180–350 word context summary. Do not answer the question. Return only JSON.`,
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
      if (contextSummary.length < 150 || hasLikelyAnswerLeak(contextSummary))
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
Publisher's claimed answer status: ${question.claimed_status}
Existing context: ${question.context_summary}
Existing source records: ${JSON.stringify(references.results ?? [])}
Current unsaved working copy: ${JSON.stringify({ contextSummary: body.contextSummary, sections: body.sections })}
Editorial change request: ${instruction || "Create a comprehensive general enrichment."}
Existing question candidates: ${JSON.stringify(candidatesResult.results ?? [])}

Write a 180–350 word context summary plus 5–8 encyclopedic Story sections about the question's origins, changing vocabulary, history of inquiry, significance, appearances across fields, methodological difficulties, and lines of further inquiry. Each section paragraph must exceed 120 words. Explain the QUESTION and its history; do not state, imply, or summarize an answer. Never use phrases such as “the answer is”, “this proves”, or “therefore the answer”. The summary, lists, and callouts must also remain contextual.

Suggest an answer-status classification only as metadata about whether sufficiently established answers exist outside Tambaya. The rationale must describe verification scope and uncertainty without disclosing any answer. Treat statusConfidence as LOW unless the supplied source records support a stronger assessment. Source leads must be credible HTTPS references for an editor to verify; never fabricate article titles or URLs.

Also propose up to 8 meaningful outbound relationships in the form “this question RELATIONSHIP_TYPE candidate question”. Use only IDs, slugs, and exact question titles from Existing question candidates. Do not force weak connections. Give each a 0–1 confidence and a concise rationale. Return an empty relationships array if none are defensible. Return only the requested JSON.`;
  try {
    const result = await env.AI.run(
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      {
        messages: [
          {
            role: "system",
            content:
              "You are a cautious encyclopedic editor. You describe the history and shape of questions without answering them.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_schema", json_schema: schema },
        max_tokens: 6500,
      },
    );
    const proposal = parseEnrichmentProposal(unwrap(result));
    const candidates = new Map(
      (candidatesResult.results ?? []).map((candidate) => [
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
    return Response.json({ proposal }, { headers: editorialHeaders });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unknown model response";
    return Response.json(
      { error: `The enrichment proposal was rejected safely: ${detail}` },
      { status: 422, headers: editorialHeaders },
    );
  }
}
