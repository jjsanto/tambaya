import { getCloudflareContext } from "@opennextjs/cloudflare";
import { editorialHeaders, hasEditorialAccess, unauthorized } from "@/lib/editorial-auth";
import { isSameOrigin } from "@/lib/auth";
import { eventStatement } from "@/lib/submission-events";
import type { CloudflareBindings } from "@/types/cloudflare";

const go = (request: Request, id: string) => new Response(null, { status: 303, headers: { Location: new URL(`/editorial/submissions/${id}`, request.url).toString(), ...editorialHeaders } });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await getCloudflareContext({ async: true }) as unknown as { env: CloudflareBindings };
  if (!await hasEditorialAccess(request, env)) return unauthorized();
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const [{ id }, data] = await Promise.all([params, request.formData()]);
  const action = String(data.get("action") ?? "comment");
  if (action === "resolve") {
    const commentId = String(data.get("commentId") ?? "");
    await env.DB.prepare("UPDATE editorial_comments SET resolved=1,resolved_at=CURRENT_TIMESTAMP WHERE id=? AND question_id=?").bind(commentId, id).run();
    return go(request, id);
  }
  if (action === "request_changes" || action === "reject") {
    const reviewNotes = String(data.get("reviewNotes") ?? "").trim();
    if (reviewNotes.length < 10 || reviewNotes.length > 1000) return Response.json({ error: `Give the publisher a clear ${action === "reject" ? "rejection reason" : "revision summary"} of 10–1000 characters.` }, { status: 400 });
    const question = await env.DB.prepare("SELECT submission_state,editorial_outcome FROM questions WHERE id=?").bind(id).first<{ submission_state: string | null; editorial_outcome: string | null }>();
    if (question?.submission_state !== "SUBMITTED" || question.editorial_outcome) return Response.json({ error: "Only active submitted questions can receive an editorial decision." }, { status: 409 });
    if (action === "reject") {
      await env.DB.batch([
        env.DB.prepare("UPDATE questions SET editorial_outcome='REJECTED',publication_state='ARCHIVED',visibility='PRIVATE',review_notes=?,reviewed_at=CURRENT_TIMESTAMP,rejected_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(reviewNotes, id),
        eventStatement(env.DB, id, "EDITORIAL", "REJECTED", reviewNotes),
      ]);
    } else {
      await env.DB.batch([
        env.DB.prepare("UPDATE questions SET submission_state='CHANGES_REQUESTED',review_notes=?,reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(reviewNotes, id),
        eventStatement(env.DB, id, "EDITORIAL", "CHANGES_REQUESTED", reviewNotes),
      ]);
    }
    return go(request, id);
  }
  const sectionKey = String(data.get("sectionKey") ?? "").trim();
  const position = Number(data.get("blockPosition"));
  const body = String(data.get("body") ?? "").trim();
  if (!sectionKey || body.length < 3 || body.length > 1000) return Response.json({ error: "Comments must contain 3–1000 characters." }, { status: 400 });
  await env.DB.prepare("INSERT INTO editorial_comments (id,question_id,section_key,block_position,body) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(), id, sectionKey, Number.isInteger(position) ? position : null, body).run();
  return go(request, id);
}
