import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getRequestUser } from "@/lib/auth";
import type { CloudflareBindings } from "@/types/cloudflare";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const [{ env }, viewer, { key }] = await Promise.all([
    getCloudflareContext({ async: true }) as unknown as Promise<{
      env: CloudflareBindings;
    }>,
    getRequestUser(request),
    params,
  ]);
  if (
    !viewer ||
    !/^[a-f0-9-]{36}\.(?:jpg|png|webp|gif)$/.test(key) ||
    !env.QUESTION_IMAGES
  )
    return new Response("Not found", { status: 404 });
  const owner = await env.DB.prepare(
    "SELECT id FROM users WHERE avatar_type='UPLOAD' AND avatar_value=?",
  )
    .bind(key)
    .first<{ id: string }>();
  if (!owner) return new Response("Not found", { status: 404 });
  if (owner.id !== viewer.id) {
    const shared = await env.DB.prepare(
      "SELECT 1 shared FROM circle_members mine JOIN circle_members theirs ON theirs.circle_id=mine.circle_id WHERE mine.user_id=? AND theirs.user_id=? LIMIT 1",
    )
      .bind(viewer.id, owner.id)
      .first<{ shared: number }>();
    if (!shared) return new Response("Not found", { status: 404 });
  }
  const object = await env.QUESTION_IMAGES.getWithMetadata<{
    contentType?: string;
  }>(key, { type: "stream" });
  if (!object.value) return new Response("Not found", { status: 404 });
  return new Response(object.value, {
    headers: {
      "Content-Type":
        object.metadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
