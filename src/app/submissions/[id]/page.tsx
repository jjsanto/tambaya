import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthDatabase, getCurrentUser } from "@/lib/auth";
import { loadSubmission } from "@/lib/submissions";
import { SubmissionEditor } from "@/components/submission-editor";
export const metadata: Metadata = { title: "Question draft" };
type Comment={id:string;section_key:string;block_position:number|null;body:string;resolved:number;created_at:string};
type Event={id:string;actor_type:string;event_type:string;note:string|null;snapshot_json:string|null;created_at:string};
export default async function SubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [db, { id }] = await Promise.all([getAuthDatabase(), params]);
  if (!db) redirect("/login");
  const [submission, categories,commentsResult,eventsResult] = await Promise.all([
    loadSubmission(db, id, user.id),
    db
      .prepare("SELECT id,name FROM categories ORDER BY name")
      .all<{ id: string; name: string }>(),
    db.prepare("SELECT id,section_key,block_position,body,resolved,created_at FROM editorial_comments WHERE question_id=? ORDER BY resolved,created_at DESC").bind(id).all<Comment>(),
    db.prepare("SELECT id,actor_type,event_type,note,snapshot_json,created_at FROM submission_events WHERE question_id=? ORDER BY created_at DESC").bind(id).all<Event>(),
  ]);
  if (!submission) notFound();
  return (
    <div className="page shell">
      <nav className="breadcrumbs">
        <Link href="/account/submissions">Your submissions</Link>
        <span>/</span>
        <span>{submission.state.toLowerCase().replaceAll("_", " ")}</span>
      </nav>
      <header className="page-intro compact">
        <span className="eyebrow">Publisher workspace</span>
        <h1>{submission.questionText}</h1>
      </header>
      <SubmissionEditor
        categories={categories.results ?? []}
        initial={submission}
      />
      <section className="publisher-review-panel"><div><span className="eyebrow">Editorial feedback</span><h2>Comments on your Story</h2>{(commentsResult.results??[]).length?(commentsResult.results??[]).map(comment=><article className={comment.resolved?"resolved":""} key={comment.id}><strong>{comment.section_key.replaceAll("-"," ")} · {comment.block_position===null?"section":`block ${comment.block_position+1}`}</strong><p>{comment.body}</p><small>{comment.resolved?"Resolved":`Open · ${comment.created_at}`}</small></article>):<p className="empty compact-empty">No inline editorial comments yet.</p>}</div><aside><span className="eyebrow">Submission timeline</span>{(eventsResult.results??[]).map(event=><article key={event.id}><strong>{event.event_type.replaceAll("_"," ")}</strong><small>{event.actor_type.toLowerCase()} · {event.created_at}</small>{event.note&&<p>{event.note}</p>}{event.snapshot_json&&<details><summary>Compare revision snapshot</summary><pre>{JSON.stringify(JSON.parse(event.snapshot_json),null,2)}</pre></details>}</article>)}</aside></section>
    </div>
  );
}
