import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifyEditorialToken } from "@/lib/editorial-auth";
import type { CloudflareBindings } from "@/types/cloudflare";

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true }) as unknown as { env: CloudflareBindings };
  const data = await request.formData(); const token = String(data.get("token") ?? "").trim();
  const destination = new URL(`/editorial?login=${await verifyEditorialToken(token, env) ? "success" : "failed"}`, request.url);
  if (destination.searchParams.get("login") === "failed") return new Response(null, { status: 303, headers: { Location: destination.toString(), "Cache-Control": "no-store" } });
  return new Response(null, { status: 303, headers: { Location: destination.toString(), "Set-Cookie": `tambaya_editorial=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/api/editorial; Max-Age=28800`, "Cache-Control": "no-store" } });
}
