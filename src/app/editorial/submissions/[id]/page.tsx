import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifyEditorialToken } from "@/lib/editorial-auth";
import { loadSubmission } from "@/lib/submissions";
import { StoryBlocks } from "@/components/story-blocks";
import type { CloudflareBindings } from "@/types/cloudflare";

export const metadata: Metadata = { title: "Review submission" };
type Comment = { id: string; section_key: string; block_position: number | null; body: string; resolved: number; created_at: string };
type Event = { id: string; actor_type: string; event_type: string; note: string | null; snapshot_json: string | null; created_at: string };

export default async function ReviewSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ env }, { id }, cookieStore] = await Promise.all([
    getCloudflareContext({ async: true }) as unknown as Promise<{ env: CloudflareBindings }>, params, cookies(),
  ]);
  if (!await verifyEditorialToken(cookieStore.get("tambaya_editorial")?.value, env)) redirect("/editorial");
  const [submission, commentsResult, eventsResult, publisher] = await Promise.all([
    loadSubmission(env.DB, id),
    env.DB.prepare("SELECT id,section_key,block_position,body,resolved,created_at FROM editorial_comments WHERE question_id=? ORDER BY resolved,created_at").bind(id).all<Comment>(),
    env.DB.prepare("SELECT id,actor_type,event_type,note,snapshot_json,created_at FROM submission_events WHERE question_id=? ORDER BY created_at DESC").bind(id).all<Event>(),
    env.DB.prepare("SELECT u.username FROM questions q LEFT JOIN users u ON u.id=q.publisher_id WHERE q.id=?").bind(id).first<{ username: string | null }>(),
  ]);
  if (!submission) notFound();
  const comments = commentsResult.results ?? [];
  return <div className="page shell review-page">
    <nav className="breadcrumbs"><Link href="/editorial?login=success">Editorial workspace</Link><span>/</span><span>Submission review</span></nav>
    <header className="page-intro"><span className="eyebrow">{submission.state.replaceAll("_", " ")} · by {publisher?.username ?? "former publisher"}</span><h1>{submission.questionText}</h1><p>{submission.contextSummary}</p></header>
    {submission.state === "SUBMITTED" && <form className="review-decision" action={`/api/editorial/questions/${id}/comments`} method="post">
      <input type="hidden" name="action" value="request_changes" />
      <div><span className="eyebrow">Editorial decision</span><h2>Return this question for revision</h2><p>Summarize the changes required. The publisher will regain editing access, see this note and all inline comments, and can resubmit the revised Story.</p></div>
      <label>Revision summary<textarea name="reviewNotes" required minLength={10} maxLength={1000} rows={4} placeholder="Explain what the publisher should address before resubmitting." /></label>
      <button className="button" type="submit">Return to publisher</button>
    </form>}
    <div className="review-layout"><main>{submission.sections.map((section, sectionIndex) => <section className="review-section" key={section.key}>
      <span className="eyebrow">{section.kicker}</span><h2>{section.title}</h2>
      {section.blocks.map((block, blockIndex) => {
        const blockComments = comments.filter(comment => comment.section_key === section.key && comment.block_position === blockIndex);
        return <article className="review-block" key={blockIndex}><StoryBlocks blocks={[block]} /><aside>
          {blockComments.map(comment => <div className={comment.resolved ? "resolved" : ""} key={comment.id}><p>{comment.body}</p><small>{comment.resolved ? "Resolved" : comment.created_at}</small>{!comment.resolved && <form action={`/api/editorial/questions/${id}/comments`} method="post"><input type="hidden" name="action" value="resolve" /><input type="hidden" name="commentId" value={comment.id} /><button className="text-button">Resolve</button></form>}</div>)}
          <form action={`/api/editorial/questions/${id}/comments`} method="post"><input type="hidden" name="sectionKey" value={section.key} /><input type="hidden" name="blockPosition" value={blockIndex} /><label>Comment on block {blockIndex + 1}<textarea name="body" required minLength={3} maxLength={1000} rows={3} /></label><button className="button ghost small">Add comment</button></form>
        </aside></article>;
      })}<small>Section {sectionIndex + 1} · {section.blocks.length} blocks</small>
    </section>)}</main><aside className="review-history"><span className="eyebrow">Submission timeline</span>{(eventsResult.results ?? []).map(event => <article key={event.id}><strong>{event.event_type.replaceAll("_", " ")}</strong><small>{event.actor_type.toLowerCase()} · {event.created_at}</small>{event.note && <p>{event.note}</p>}{event.snapshot_json && <details><summary>Revision snapshot</summary><pre>{JSON.stringify(JSON.parse(event.snapshot_json), null, 2)}</pre></details>}</article>)}</aside></div>
  </div>;
}
