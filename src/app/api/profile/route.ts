import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getRequestUser, isSameOrigin } from "@/lib/auth";
import {
  allowedImageTypes,
  detectedImageType,
  imageUploadMaxBytes,
  type AllowedImageType,
} from "@/lib/image-upload";
import { avatarPresets } from "@/components/profile-avatar";
import type { CloudflareBindings } from "@/types/cloudflare";
const runtime = async () =>
  (await getCloudflareContext({ async: true })) as unknown as {
    env: CloudflareBindings;
  };
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const [{ env }, user, data] = await Promise.all([
    runtime(),
    getRequestUser(request),
    request.formData(),
  ]);
  if (!user) return new Response("Unauthorized", { status: 401 });
  const bio = String(data.get("bio") ?? "")
    .trim()
    .slice(0, 1200);
  const interests = String(data.get("interests") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 20)
    .join(", ")
    .slice(0, 600);
  const preset = String(data.get("preset") ?? "");
  const requestedGender = String(data.get("gender") ?? "UNSPECIFIED");
  const gender = ["FEMALE", "MALE", "UNSPECIFIED"].includes(requestedGender)
    ? requestedGender
    : "UNSPECIFIED";
  const file = data.get("photo");
  const current = await env.DB.prepare(
    "SELECT avatar_type,avatar_value FROM users WHERE id=?",
  )
    .bind(user.id)
    .first<{ avatar_type: string; avatar_value: string }>();
  let avatarType = current?.avatar_type ?? "PRESET",
    avatarValue = current?.avatar_value ?? "explorer";
  const selectedPreset = avatarPresets.find((item) => item.id === preset);
  if (selectedPreset && gender !== "UNSPECIFIED" && selectedPreset.gender !== gender)
    return new Response("Choose an avatar that matches the selected gender.", { status: 400 });
  if (selectedPreset) {
    avatarType = "PRESET";
    avatarValue = preset;
  }
  let newKey = "";
  if (file instanceof File && file.size > 0) {
    if (!env.QUESTION_IMAGES)
      return new Response("Image storage unavailable", { status: 503 });
    if (file.size > imageUploadMaxBytes)
      return new Response("Photo must be no larger than 5 MB.", {
        status: 413,
      });
    const buffer = await file.arrayBuffer();
    const detected = detectedImageType(buffer);
    if (!detected || detected !== file.type || !(detected in allowedImageTypes))
      return new Response("Upload a genuine JPEG, PNG, WebP, or GIF image.", {
        status: 415,
      });
    newKey = `${crypto.randomUUID()}.${allowedImageTypes[detected as AllowedImageType]}`;
    await env.QUESTION_IMAGES.put(newKey, buffer, {
      metadata: {
        contentType: detected,
        originalName: file.name.slice(0, 180),
        ownerId: user.id,
        size: file.size,
        kind: "PROFILE",
      },
    });
    avatarType = "UPLOAD";
    avatarValue = newKey;
  }
  const statements = [
    env.DB.prepare(
      "UPDATE users SET bio=?,interests=?,gender=?,avatar_type=?,avatar_value=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    ).bind(bio, interests, gender, avatarType, avatarValue, user.id),
  ];
  if (newKey)
    statements.push(
      env.DB.prepare(
        "INSERT INTO question_uploads (object_key,owner_id,original_name,content_type,byte_size) VALUES (?,?,?,?,?)",
      ).bind(
        newKey,
        user.id,
        (file as File).name.slice(0, 180),
        (file as File).type,
        (file as File).size,
      ),
    );
  await env.DB.batch(statements);
  if (
    current?.avatar_type === "UPLOAD" &&
    current.avatar_value !== avatarValue
  ) {
    await Promise.all([
      env.QUESTION_IMAGES?.delete(current.avatar_value),
      env.DB.prepare(
        "DELETE FROM question_uploads WHERE object_key=? AND owner_id=?",
      )
        .bind(current.avatar_value, user.id)
        .run(),
    ]);
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL("/account/profile?saved=1", request.url).toString(),
    },
  });
}
