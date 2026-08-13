import { getAuthDatabase } from "@/lib/auth";
import { apiError } from "@/lib/public-api";

const ANONYMOUS_DAILY_LIMIT = 100;
const KEYED_DAILY_LIMIT = 5000;

type ApiKeyRow = { id: string; key_prefix: string };
type UsageRow = { total: number };

export type PublicApiAccess = {
  actorKey: string;
  apiKeyId: string | null;
  limit: number;
  remaining: number;
  authenticated: boolean;
};

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function digestApiKey(value: string) { return sha256(value); }

export function generateApiKey() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const secret = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `tb_live_${secret}`;
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : null;
}

export async function authorizePublicApi(request: Request): Promise<PublicApiAccess | Response> {
  const db = await getAuthDatabase();
  if (!db) return apiError(request, 503, "API_UNAVAILABLE", "API access control is temporarily unavailable.");
  const token = bearerToken(request);
  let apiKey: ApiKeyRow | null = null;
  if (token) {
    if (!token.startsWith("tb_live_")) return apiError(request, 401, "INVALID_API_KEY", "The bearer token is not a Tambaya API key.");
    apiKey = await db.prepare("SELECT id,key_prefix FROM public_api_keys WHERE key_hash=? AND revoked_at IS NULL").bind(await digestApiKey(token)).first<ApiKeyRow>();
    if (!apiKey) return apiError(request, 401, "INVALID_API_KEY", "The API key is invalid or has been revoked.");
  }
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const actorKey = apiKey ? `key:${apiKey.id}` : `anon:${await sha256(ip)}`;
  const limit = apiKey ? KEYED_DAILY_LIMIT : ANONYMOUS_DAILY_LIMIT;
  const usage = await db.prepare("SELECT COALESCE(SUM(request_count),0) total FROM public_api_usage WHERE actor_key=? AND usage_date=date('now')").bind(actorKey).first<UsageRow>();
  const used = Number(usage?.total ?? 0);
  if (used >= limit) {
    const response = await apiError(request, 429, "RATE_LIMIT_EXCEEDED", "The daily API request allowance has been reached.");
    response.headers.set("Retry-After", "86400");
    response.headers.set("X-RateLimit-Limit", String(limit));
    response.headers.set("X-RateLimit-Remaining", "0");
    return response;
  }
  return { actorKey, apiKeyId: apiKey?.id ?? null, limit, remaining: limit - used - 1, authenticated: Boolean(apiKey) };
}

export async function recordPublicApiUsage(access: PublicApiAccess, endpoint: string, response: Response) {
  const db = await getAuthDatabase();
  if (db) {
    await db.prepare("INSERT INTO public_api_usage(actor_key,api_key_id,usage_date,endpoint,request_count,error_count) VALUES(?,?,date('now'),?,1,?) ON CONFLICT(actor_key,usage_date,endpoint) DO UPDATE SET request_count=request_count+1,error_count=error_count+excluded.error_count,updated_at=CURRENT_TIMESTAMP").bind(access.actorKey, access.apiKeyId, endpoint, response.status >= 400 ? 1 : 0).run();
    if (access.apiKeyId) await db.prepare("UPDATE public_api_keys SET last_used_at=CURRENT_TIMESTAMP WHERE id=?").bind(access.apiKeyId).run();
  }
  response.headers.set("X-RateLimit-Limit", String(access.limit));
  response.headers.set("X-RateLimit-Remaining", String(access.remaining));
  response.headers.set("X-API-Authentication", access.authenticated ? "api-key" : "anonymous");
  response.headers.append("Access-Control-Expose-Headers", "X-RateLimit-Limit, X-RateLimit-Remaining, X-API-Authentication");
  return response;
}

export async function withPublicApiAccess(request: Request, endpoint: string, handler: () => Promise<Response>) {
  const access = await authorizePublicApi(request);
  if (access instanceof Response) return access;
  return recordPublicApiUsage(access, endpoint, await handler());
}
