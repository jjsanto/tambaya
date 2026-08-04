import type { CloudflareBindings } from "@/types/cloudflare";

const editorialTokenDigest = "a2b1ef570b77939326e7279e1a7605fbcb6c327066b1984afc797c17febbf44f";

export async function verifyEditorialToken(candidate: string | undefined, env: CloudflareBindings) {
  const token = candidate?.trim();
  if (!token) return false;
  if (env.EDITORIAL_TOKEN) return token === env.EDITORIAL_TOKEN;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("") === editorialTokenDigest;
}

export async function hasEditorialAccess(request: Request, env: CloudflareBindings) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const cookie = request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith("tambaya_editorial="))?.slice("tambaya_editorial=".length);
  return verifyEditorialToken(bearer || (cookie ? decodeURIComponent(cookie) : undefined), env);
}

export const editorialHeaders = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Authorization" };
export const unauthorized = () => Response.json({ error: "Unauthorized" }, { status: 401, headers: editorialHeaders });
