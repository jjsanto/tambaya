import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthDatabase, getCurrentUser } from "@/lib/auth";
import { QuestionMaturity } from "@/components/question-maturity";
export const metadata: Metadata = { title: "Your question submissions" };
type Row = {
  id: string;
  slug: string;
  question_text: string;
  submission_state: string;
  review_notes: string;
  updated_at: string;
  publication_state: string;
  open_comments: number;
  context_length: number;
  section_count: number;
  source_count: number;
  relationship_count: number;
  verification_state: string;
};
export default async function SubmissionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = await getAuthDatabase();
  if (!db) redirect("/login");
  const rows =
    (
      await db
        .prepare(
          "SELECT id,slug,question_text,CASE WHEN editorial_outcome='REJECTED' THEN 'REJECTED' ELSE submission_state END submission_state,COALESCE(review_notes,'') review_notes,updated_at,publication_state,verification_state,length(COALESCE(context_summary,'')) context_length,(SELECT COUNT(*) FROM editorial_comments ec WHERE ec.question_id=questions.id AND ec.resolved=0) open_comments,(SELECT COUNT(*) FROM question_story_sections ss WHERE ss.question_id=questions.id) section_count,(SELECT COUNT(*) FROM question_references qr WHERE qr.question_id=questions.id) source_count,(SELECT COUNT(*) FROM question_relationships rel WHERE rel.verified=1 AND (rel.source_question_id=questions.id OR rel.target_question_id=questions.id)) relationship_count FROM questions WHERE publisher_id=? AND submission_state IS NOT NULL ORDER BY updated_at DESC",
        )
        .bind(user.id)
        .all<Row>()
    ).results ?? [];
  return (
    <div className="page shell">
      <nav className="breadcrumbs">
        <Link href="/account">My Space</Link>
        <span>/</span>
        <span>Question submissions</span>
      </nav>
      <header className="page-intro">
        <span className="eyebrow">Your publishing</span>
        <h1>Question submissions</h1>
        <p>
          Continue private drafts and follow each question through editorial
          review.
        </p>
        <Link className="button" href="/publish">
          Start a new question
        </Link>
      </header>
      <div className="submission-list">
        {rows.map((row) => (
          <article key={row.id}>
            <div>
              <span
                className={`submission-state state-${row.submission_state.toLowerCase()}`}
              >
                {row.submission_state.replaceAll("_", " ")}
              </span>
              <h2>{row.question_text}</h2>
              <QuestionMaturity
                facts={{
                  asked: true,
                  context: row.context_length >= 150 && row.section_count > 0,
                  sources: row.source_count > 0,
                  relationships: row.relationship_count > 0,
                  verified:
                    row.verification_state === "VERIFIED" &&
                    row.publication_state === "PUBLISHED",
                }}
              />
              {row.open_comments > 0 && (
                <p className="feedback-alert">
                  ● {row.open_comments} open editorial comment
                  {row.open_comments === 1 ? "" : "s"}
                </p>
              )}
              {row.review_notes && (
                <p>
                  <strong>Editorial note:</strong> {row.review_notes}
                </p>
              )}
              <small>
                Updated{" "}
                {new Date(
                  row.updated_at.replace(" ", "T") + "Z",
                ).toLocaleDateString("en-GB")}
              </small>
            </div>
            {row.publication_state === "PUBLISHED" ? (
              <Link className="button small" href={`/questions/${row.slug}`}>
                View published
              </Link>
            ) : (
              <Link
                className="button ghost small"
                href={`/submissions/${row.id}`}
              >
                {row.submission_state === "SUBMITTED"
                  ? "Preview"
                  : "Continue editing"}
              </Link>
            )}
          </article>
        ))}
        {!rows.length && (
          <div className="empty">
            <h2>No questions submitted yet.</h2>
            <p>
              Start with a question, then build its context as a rich Story.
            </p>
            <Link className="button small" href="/publish">
              Publish a question
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
