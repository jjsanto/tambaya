import { getCloudflareContext } from "@opennextjs/cloudflare";
import { D1QuestionRepository } from "@/data/d1-repository";
import { hasLikelyAnswerLeak, isAnswerStatus } from "@/domain/question";
import type { CloudflareBindings } from "@/types/cloudflare";

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true }) as unknown as { env: CloudflareBindings };
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (env.EDITORIAL_TOKEN && token !== env.EDITORIAL_TOKEN) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = request.headers.get("content-type")?.includes("application/json")
    ? await request.json() as Record<string, unknown>
    : Object.fromEntries(await request.formData());
  if (typeof body.questionText !== "string" || body.questionText.trim().length < 10 || !body.questionText.trim().endsWith("?")) return Response.json({ error: "Write a complete question ending in a question mark." }, { status: 400 });
  if (!isAnswerStatus(body.claimedStatus)) return Response.json({ error: "Invalid answer status metadata." }, { status: 400 });
  if (typeof body.contextSummary !== "string" || hasLikelyAnswerLeak(body.contextSummary)) return Response.json({ error: "Context is missing or may resolve the question." }, { status: 400 });
  const draft = await new D1QuestionRepository(env.DB).createDraft({ questionText: body.questionText.trim(), claimedStatus: body.claimedStatus, category: String(body.category ?? "Uncategorised"), contextSummary: body.contextSummary });
  return Response.json(draft, { status: 201 });
}
