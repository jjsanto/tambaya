import type { D1DatabaseLike } from "@/types/cloudflare";

const encoder = new TextEncoder();
export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export function createAgentToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `tby_agent_${btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")}`;
}
export async function authorizeAgent(
  request: Request,
  db: D1DatabaseLike,
  questionId: string,
  scope: "brief:read" | "proposal:write",
) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token?.startsWith("tby_agent_")) return null;
  const hash = await sha256(token);
  const row = await db.prepare(
    "SELECT id,question_id questionId,label,scopes FROM external_agent_tokens WHERE token_hash=? AND question_id=? AND revoked_at IS NULL AND expires_at>CURRENT_TIMESTAMP",
  ).bind(hash, questionId).first<{ id: string; questionId: string; label: string; scopes: string }>();
  if (!row || !row.scopes.split(",").includes(scope)) return null;
  const recent = await db.prepare(
    "SELECT COUNT(*) count FROM external_agent_requests WHERE token_id=? AND created_at>=datetime('now','-1 minute')",
  ).bind(row.id).first<{ count: number }>();
  if ((recent?.count ?? 0) >= 30) return { limited: true as const, row };
  await db.batch([
    db.prepare("INSERT INTO external_agent_requests (id,token_id,action) VALUES (?,?,?)").bind(crypto.randomUUID(), row.id, scope),
    db.prepare("UPDATE external_agent_tokens SET last_used_at=CURRENT_TIMESTAMP WHERE id=?").bind(row.id),
  ]);
  return { limited: false as const, row };
}

export const agentHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
};
