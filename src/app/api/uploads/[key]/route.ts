import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getRequestUser, isSameOrigin } from "@/lib/auth";
import {
  allowedImageTypes,
  detectedImageType,
  imageUploadMaxBytes,
  type AllowedImageType,
} from "@/lib/image-upload";
import type { CloudflareBindings } from "@/types/cloudflare";
const runtime = async () =>
  (await getCloudflareContext({ async: true })) as unknown as {
    env: CloudflareBindings;
  };
export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const [{ env }, user, data] = await Promise.all([
    runtime(),
    getRequestUser(request),
    request.formData(),
  ]);
  if (!user)
    return Response.json(
      { error: "Log in to upload images." },
      { status: 401 },
    );
  if (!env.QUESTION_IMAGES)
    return Response.json(
      { error: "Image storage is temporarily unavailable." },
      { status: 503 },
    );
  const value = data.get("image");
  if (!(value instanceof File))
    return Response.json(
      { error: "Choose an image from your computer." },
      { status: 400 },
    );
  if (value.size < 1 || value.size > imageUploadMaxBytes)
    return Response.json(
      { error: "Images must be no larger than 5 MB." },
      { status: 413 },
    );
  const buffer = await value.arrayBuffer();
  const detected = detectedImageType(buffer);
  if (!detected || detected !== value.type || !(detected in allowedImageTypes))
    return Response.json(
      { error: "Upload a genuine JPEG, PNG, WebP, or GIF image." },
      { status: 415 },
    );
  const extension = allowedImageTypes[detected as AllowedImageType];
  const key = `${crypto.randomUUID()}.${extension}`;
  await env.QUESTION_IMAGES.put(key, buffer, {
    metadata: {
      contentType: detected,
      originalName: value.name.slice(0, 180),
      ownerId: user.id,
      size: value.size,
    },
  });
  try {
    await env.DB.prepare(
      "INSERT INTO question_uploads (object_key,owner_id,original_name,content_type,byte_size) VALUES (?,?,?,?,?)",
    )
      .bind(key, user.id, value.name.slice(0, 180), detected, value.size)
      .run();
  } catch {
    await env.QUESTION_IMAGES.delete(key);
    return Response.json(
      { error: "The upload could not be recorded." },
      { status: 500 },
    );
  }
  return Response.json({ url: `/api/uploads/${key}`, key }, { status: 201 });
}
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  if (!/^[a-f0-9-]{36}\.(?:jpg|png|webp|gif)$/.test(key))
    return new Response("Not found", { status: 404 });
  const { env } = await runtime();
  if (!env.QUESTION_IMAGES) return new Response("Not found", { status: 404 });
  const object = await env.QUESTION_IMAGES.getWithMetadata<{
    contentType?: string;
    kind?: string;
  }>(key, { type: "stream" });
  if (!object.value) return new Response("Not found", { status: 404 });
  if (object.metadata?.kind === "PROFILE") return new Response("Not found", { status: 404 });
  return new Response(object.value, {
    headers: {
      "Content-Type":
        object.metadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const [{ env }, user, { key }] = await Promise.all([
    runtime(),
    getRequestUser(request),
    params,
  ]);
  if (!user) return new Response("Unauthorized", { status: 401 });
  const owned = await env.DB.prepare(
    "SELECT qu.object_key FROM question_uploads qu LEFT JOIN questions q ON q.id=qu.question_id WHERE qu.object_key=? AND qu.owner_id=? AND (q.publication_state IS NULL OR q.publication_state='DRAFT')",
  )
    .bind(key, user.id)
    .first<{ object_key: string }>();
  if (!owned) return new Response("Not found", { status: 404 });
  await Promise.all([
    env.QUESTION_IMAGES?.delete(key),
    env.DB.prepare(
      "DELETE FROM question_uploads WHERE object_key=? AND owner_id=?",
    )
      .bind(key, user.id)
      .run(),
  ]);
  return new Response(null, { status: 204 });
}
