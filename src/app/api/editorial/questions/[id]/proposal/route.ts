import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  editorialHeaders,
  hasEditorialAccess,
  unauthorized,
} from "@/lib/editorial-auth";
import type { CloudflareBindings } from "@/types/cloudflare";

const MAX_PROPOSAL_BYTES = 1_000_000;

async function runtime() {
  return (await getCloudflareContext({ async: true })) as unknown as {
    env: CloudflareBindings;
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { env } = await runtime();
  if (!(await hasEditorialAccess(request, env))) return unauthorized();
  const { id } = await params;
  const proposal = await env.DB.prepare(
    "SELECT specification_json specificationJson,agent_name agentName,model_name modelName,protocol_version protocolVersion,created_at createdAt,updated_at updatedAt FROM external_editorial_proposals WHERE question_id=?",
  )
    .bind(id)
    .first<{
      specificationJson: string;
      agentName: string;
      modelName: string;
      protocolVersion: number;
      createdAt: string;
      updatedAt: string;
    }>();
  return Response.json(
    { externalProposal: proposal ? { ...proposal, specification: JSON.parse(proposal.specificationJson) } : null },
    { headers: editorialHeaders },
  );
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { env } = await runtime();
  if (!(await hasEditorialAccess(request, env))) return unauthorized();
  const { id } = await params;
  const raw = await request.text();
  if (!raw || new TextEncoder().encode(raw).length > MAX_PROPOSAL_BYTES)
    return Response.json({ error: "Proposal payload is empty or larger than 1 MB." }, { status: 400 });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Proposal payload is not valid JSON." }, { status: 400 });
  }
  const specification = body.specification;
  if (!specification || typeof specification !== "object" || Array.isArray(specification))
    return Response.json({ error: "A validated specification is required." }, { status: 400 });
  const exists = await env.DB.prepare("SELECT 1 found FROM questions WHERE id=?")
    .bind(id)
    .first<{ found: number }>();
  if (!exists) return Response.json({ error: "Question not found." }, { status: 404 });
  const agentName = String(body.agentName ?? "").trim().slice(0, 120);
  const modelName = String(body.modelName ?? "").trim().slice(0, 120);
  await env.DB.prepare(
    "INSERT INTO external_editorial_proposals (question_id,specification_json,agent_name,model_name,protocol_version) VALUES (?,?,?,?,1) ON CONFLICT(question_id) DO UPDATE SET specification_json=excluded.specification_json,agent_name=excluded.agent_name,model_name=excluded.model_name,protocol_version=1,updated_at=CURRENT_TIMESTAMP",
  )
    .bind(id, JSON.stringify(specification), agentName, modelName)
    .run();
  return Response.json({ saved: true }, { headers: editorialHeaders });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { env } = await runtime();
  if (!(await hasEditorialAccess(request, env))) return unauthorized();
  const { id } = await params;
  await env.DB.prepare("DELETE FROM external_editorial_proposals WHERE question_id=?")
    .bind(id)
    .run();
  return Response.json({ discarded: true }, { headers: editorialHeaders });
}
