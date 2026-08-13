export const API_VERSION = "1.0.0";
export const publicApiHeaders = {
  "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Expose-Headers": "ETag",
  "X-Content-Type-Options": "nosniff",
};
export async function apiJson(request: Request, body: unknown, init: ResponseInit = {}) {
  const json = JSON.stringify(body);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(json));
  const etag = `"${Array.from(new Uint8Array(digest).slice(0, 12), b => b.toString(16).padStart(2, "0")).join("")}"`;
  const headers = new Headers(publicApiHeaders);
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  headers.set("ETag", etag);
  headers.set("Content-Type", "application/json; charset=utf-8");
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  return new Response(json, { ...init, headers });
}
export function apiError(request: Request, status: number, code: string, message: string) {
  return apiJson(request, { apiVersion: API_VERSION, error: { code, message, status } }, { status });
}
export function integerParam(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}
