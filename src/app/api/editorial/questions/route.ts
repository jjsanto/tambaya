import { getCloudflareContext } from "@opennextjs/cloudflare";
import { D1QuestionRepository } from "@/data/d1-repository";
import { hasLikelyAnswerLeak, isAnswerStatus } from "@/domain/question";
import type { CloudflareBindings } from "@/types/cloudflare";

const editorialTokenDigest = "a2b1ef570b77939326e7279e1a7605fbcb6c327066b1984afc797c17febbf44f";

async function hasEditorialAccess(token: string | undefined, configuredToken: string | undefined) {
  if (!token) return false;
  if (configuredToken) return token === configuredToken;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("") === editorialTokenDigest;
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true }) as unknown as { env: CloudflareBindings };
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!await hasEditorialAccess(token, env.EDITORIAL_TOKEN)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = request.headers.get("content-type")?.includes("application/json")
    ? await request.json() as Record<string, unknown>
    : Object.fromEntries(await request.formData());
  if (typeof body.questionText !== "string" || body.questionText.trim().length < 10 || !body.questionText.trim().endsWith("?")) return Response.json({ error: "Write a complete question ending in a question mark." }, { status: 400 });
  if (!isAnswerStatus(body.claimedStatus)) return Response.json({ error: "Invalid answer status metadata." }, { status: 400 });
  if (typeof body.contextSummary !== "string" || hasLikelyAnswerLeak(body.contextSummary)) return Response.json({ error: "Context is missing or may resolve the question." }, { status: 400 });
  const draft = await new D1QuestionRepository(env.DB).createDraft({ questionText: body.questionText.trim(), claimedStatus: body.claimedStatus, category: String(body.category ?? "Uncategorised"), contextSummary: body.contextSummary });
  return Response.json(draft, { status: 201 });
}
