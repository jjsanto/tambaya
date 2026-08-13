import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAgentToken, sha256 } from "@/lib/agent-auth";
import { editorialHeaders, hasEditorialAccess, unauthorized } from "@/lib/editorial-auth";
import type { CloudflareBindings } from "@/types/cloudflare";

async function runtime() {
  return (await getCloudflareContext({ async: true })) as unknown as { env: CloudflareBindings };
}
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await runtime();
  if (!(await hasEditorialAccess(request, env))) return unauthorized();
  const { id } = await params;
  const result = await env.DB.prepare(
    "SELECT id,label,scopes,expires_at expiresAt,revoked_at revokedAt,last_used_at lastUsedAt,created_at createdAt FROM external_agent_tokens WHERE question_id=? ORDER BY created_at DESC LIMIT 50",
  ).bind(id).all();
  return Response.json({ tokens: result.results ?? [] }, { headers: editorialHeaders });
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await runtime();
  if (!(await hasEditorialAccess(request, env))) return unauthorized();
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const label = String(body.label ?? "External agent").trim().slice(0, 120);
  const days = Math.min(90, Math.max(1, Number(body.expiresInDays) || 7));
  const token = createAgentToken();
  const hash = await sha256(token);
  const tokenId = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO external_agent_tokens (id,question_id,label,token_hash,expires_at) SELECT ?,?,?,?,datetime('now',?) FROM questions WHERE id=?",
  ).bind(tokenId, id, label, hash, `+${days} days`, id).run();
  return Response.json({ token, tokenId, label, expiresInDays: days }, { status: 201, headers: editorialHeaders });
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await runtime();
  if (!(await hasEditorialAccess(request, env))) return unauthorized();
  const { id } = await params;
  const tokenId = new URL(request.url).searchParams.get("tokenId") ?? "";
  await env.DB.prepare(
    "UPDATE external_agent_tokens SET revoked_at=CURRENT_TIMESTAMP WHERE id=? AND question_id=? AND revoked_at IS NULL",
  ).bind(tokenId, id).run();
  return Response.json({ revoked: true }, { headers: editorialHeaders });
}
