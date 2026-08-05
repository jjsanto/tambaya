import { getCloudflareContext } from "@opennextjs/cloudflare";
import { parseEnrichmentProposal } from "@/domain/enrichment";
import { editorialHeaders, hasEditorialAccess, unauthorized } from "@/lib/editorial-auth";
import type { CloudflareBindings } from "@/types/cloudflare";

type QuestionRow = { question_text: string; context_summary: string; claimed_status: string; category_name: string };
type ReferenceRow = { title: string; publisher: string; source_url: string; purpose: string };

const schema = {
  type: "object",
  properties: {
    sections: { type: "array", minItems: 5, maxItems: 8, items: { type: "object", properties: {
      key: { type: "string" }, kicker: { type: "string" }, title: { type: "string" }, paragraph: { type: "string" },
      listItems: { type: "array", items: { type: "string" } }, callout: { type: "string" },
    }, required: ["key","kicker","title","paragraph","listItems","callout"] } },
    suggestedStatus: { type: "string", enum: ["OPEN","PARTIALLY_ANSWERED","ANSWERED"] },
    statusConfidence: { type: "string", enum: ["LOW","MEDIUM","HIGH"] },
    statusRationale: { type: "string" },
    sourceLeads: { type: "array", items: { type: "object", properties: { title: { type: "string" }, publisher: { type: "string" }, url: { type: "string" }, purpose: { type: "string" } }, required: ["title","publisher","url","purpose"] } },
  }, required: ["sections","suggestedStatus","statusConfidence","statusRationale","sourceLeads"],
};

function unwrap(result: unknown): unknown {
  const response = (result as { response?: unknown })?.response ?? result;
  if (typeof response === "string") return JSON.parse(response);
  return response;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await getCloudflareContext({ async: true }) as unknown as { env: CloudflareBindings };
  if (!await hasEditorialAccess(request, env)) return unauthorized();
  if (!env.AI) return Response.json({ error: "Workers AI is not configured for this deployment." }, { status: 503, headers: editorialHeaders });
  const { id } = await params;
  const [question, references] = await Promise.all([
    env.DB.prepare("SELECT question_text,context_summary,claimed_status,category_name FROM questions WHERE id=?").bind(id).first<QuestionRow>(),
    env.DB.prepare("SELECT title,COALESCE(publisher,'') publisher,source_url,purpose FROM question_references WHERE question_id=? ORDER BY position LIMIT 12").bind(id).all<ReferenceRow>(),
  ]);
  if (!question) return Response.json({ error: "Question not found." }, { status: 404, headers: editorialHeaders });
  const prompt = `Create a private editorial enrichment proposal for Tambaya, a platform that publishes questions but NEVER answers them.

Question: ${question.question_text}
Category: ${question.category_name}
Publisher's claimed answer status: ${question.claimed_status}
Existing context: ${question.context_summary}
Existing source records: ${JSON.stringify(references.results ?? [])}

Write 5–8 encyclopedic Story sections about the question's origins, changing vocabulary, history of inquiry, significance, appearances across fields, methodological difficulties, and lines of further inquiry. Each paragraph must exceed 120 words. Explain the QUESTION and its history; do not state, imply, or summarize an answer. Never use phrases such as “the answer is”, “this proves”, or “therefore the answer”. Lists and callouts must also remain contextual.

Suggest an answer-status classification only as metadata about whether sufficiently established answers exist outside Tambaya. The rationale must describe verification scope and uncertainty without disclosing any answer. Treat statusConfidence as LOW unless the supplied source records support a stronger assessment. Source leads must be credible HTTPS references for an editor to verify; never fabricate article titles or URLs. Return only the requested JSON.`;
  try {
    const result = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [{ role: "system", content: "You are a cautious encyclopedic editor. You describe the history and shape of questions without answering them." }, { role: "user", content: prompt }],
      response_format: { type: "json_schema", json_schema: schema },
      max_tokens: 6500,
    });
    const proposal = parseEnrichmentProposal(unwrap(result));
    return Response.json({ proposal }, { headers: editorialHeaders });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown model response";
    return Response.json({ error: `The enrichment proposal was rejected safely: ${detail}` }, { status: 422, headers: editorialHeaders });
  }
}
