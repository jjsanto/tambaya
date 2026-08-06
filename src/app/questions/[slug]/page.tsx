import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { QuestionCard } from "@/components/question-card";
import { StoryBlocks } from "@/components/story-blocks";
import { getQuestionRepository } from "@/data/question-service";
import { getAuthDatabase, getCurrentUser } from "@/lib/auth";
import { getCollections, type UserCollection } from "@/lib/library";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const q = await (
    await getQuestionRepository()
  ).findBySlug((await params).slug);
  return { title: q?.questionText ?? "Question" };
}
export default async function QuestionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const repository = await getQuestionRepository();
  const question = await repository.findBySlug((await params).slug);
  if (!question) notFound();
  const [related, user] = await Promise.all([
    repository.related(question.slug),
    getCurrentUser(),
  ]);
  let bookmarked = false;
  let followingQuestion = false;
  let userRating = 0;
  let collections: UserCollection[] = [];
  const publicDb=await getAuthDatabase();
  const [publisher,ratingSummary]=publicDb?await Promise.all([publicDb.prepare("SELECT u.username FROM questions q LEFT JOIN users u ON u.id=q.publisher_id WHERE q.id=?").bind(question.id).first<{username:string|null}>(),publicDb.prepare("SELECT COUNT(*) count,COALESCE(AVG(rating),0) average FROM question_ratings WHERE question_id=?").bind(question.id).first<{count:number;average:number}>()]):[null,null];
  if (user) {
    const db = await getAuthDatabase();
    if (db) {
      const [bookmark, ownedCollections,ownRating,follow] = await Promise.all([
        db
          .prepare(
            "SELECT 1 saved FROM user_bookmarks WHERE user_id=? AND question_id=?",
          )
          .bind(user.id, question.id)
          .first<{ saved: number }>(),
        getCollections(db, user.id),
        db.prepare("SELECT rating FROM question_ratings WHERE user_id=? AND question_id=?").bind(user.id,question.id).first<{rating:number}>(),
        db.prepare("SELECT 1 followed FROM user_question_follows WHERE user_id=? AND question_id=?").bind(user.id,question.id).first<{followed:number}>(),
      ]);
      bookmarked = Boolean(bookmark);
      collections = ownedCollections;
      userRating = ownRating?.rating ?? 0;
      followingQuestion = Boolean(follow);
    }
  }
  return (
    <article className="story-page">
      <header className="story-hero">
        <div className="shell">
          <nav className="breadcrumbs">
            <Link href="/explore">Explore</Link>
            <span>/</span>
            <Link href={`/categories/${question.categorySlug}`}>
              {question.category}
            </Link>
          </nav>
          <div className="story-heading">
            <div>
              <div className="card-meta">
                <StatusBadge status={question.verifiedStatus} />
                <span>{question.category}</span>
              </div>
              <h1>{question.questionText}</h1>
              <p className="publisher-credit">Published by <strong>{publisher?.username??"Tambaya Editorial"}</strong></p>
              <p>{question.contextSummary}</p>
              <div className="tag-row">
                {question.tags.map((t) => (
                  <span key={t}>#{t}</span>
                ))}
              </div>
            </div>
            <aside>
              <span className="eyebrow">Tambaya verification</span>
              <strong>✓ Classification verified</strong>
              <p>
                The publisher’s status claim has been reviewed. Status is
                metadata—not an answer.
              </p>
            </aside>
          </div>
        </div>
      </header>
      <nav className="story-nav">
        <div className="shell">
          <a href="#story">Story</a>
          <a href="#timeline">Timeline</a>
          <a href="#connections">Connections</a>
          <a href="#references">References</a>
        </div>
      </nav>
      <section className="save-question-bar">
        <div className="shell">
          <div>
            <strong>Keep this question</strong>
            <span>Save it, collect it, or rate how worth asking it is.</span>
          </div>
          {user ? (
            <div className="save-actions">
              <form action="/api/ratings" method="post" className="question-rating">
                <input type="hidden" name="questionId" value={question.id} />
                <input type="hidden" name="returnTo" value={`/questions/${question.slug}`} />
                <span>{ratingSummary?.count ? `${Number(ratingSummary.average).toFixed(1)} from ${ratingSummary.count}` : "Not rated yet"}</span>
                <div role="group" aria-label="Rate how worth asking this question is">{[1,2,3,4,5].map(value=><button key={value} name="rating" value={value} title={`${value} out of 5`} aria-label={`${value} out of 5`} className={value<=userRating?"selected":""}>★</button>)}</div>
              </form>
              <form action="/api/follows" method="post">
                <input type="hidden" name="targetType" value="question" />
                <input type="hidden" name="targetId" value={question.id} />
                <input type="hidden" name="action" value={followingQuestion ? "remove" : "add"} />
                <input type="hidden" name="returnTo" value={`/questions/${question.slug}`} />
                <button className={`button small ${followingQuestion ? "ghost" : ""}`}>{followingQuestion ? "✓ Following" : "+ Follow"}</button>
              </form>
              <form action="/api/bookmarks" method="post">
                <input type="hidden" name="questionId" value={question.id} />
                <input
                  type="hidden"
                  name="action"
                  value={bookmarked ? "remove" : "add"}
                />
                <input
                  type="hidden"
                  name="returnTo"
                  value={`/questions/${question.slug}`}
                />
                <button className={`button small ${bookmarked ? "ghost" : ""}`}>
                  {bookmarked ? "★ Bookmarked" : "☆ Bookmark"}
                </button>
              </form>
              {collections.length ? (
                <form
                  action="/api/collections/questions"
                  method="post"
                  className="collection-save-form"
                >
                  <input type="hidden" name="questionId" value={question.id} />
                  <input
                    type="hidden"
                    name="returnTo"
                    value={`/questions/${question.slug}`}
                  />
                  <select name="collectionId" aria-label="Collection">
                    {collections.map((collection) => (
                      <option value={collection.id} key={collection.id}>
                        {collection.name}
                      </option>
                    ))}
                  </select>
                  <button className="button ghost small">
                    Add to collection
                  </button>
                </form>
              ) : (
                <Link href="/account">Create a collection →</Link>
              )}
            </div>
          ) : (
            <Link className="button small" href="/login">
              Log in to save
            </Link>
          )}
        </div>
      </section>
      <div className="shell story-layout">
        <main id="story">
          <span className="chapter">The question story</span>
          {question.storySections.map((section, index) => (
            <section id={section.id} key={section.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <small className="section-kicker">{section.kicker}</small>
                <h2>{section.title}</h2>
                {section.blocks?.length ? (
                  <StoryBlocks blocks={section.blocks} />
                ) : (
                  section.paragraphs.map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex}>{paragraph}</p>
                  ))
                )}
                <small className="review-line">
                  ✓ Editorially reviewed · answer-leak check{" "}
                  {section.review.answerLeakState.toLowerCase()}
                </small>
              </div>
            </section>
          ))}
        </main>
        <aside className="story-aside">
          <strong>A note on context</strong>
          <p>
            Tambaya explains how this question arose and why it matters. It
            deliberately does not resolve it.
          </p>
          <p>
            {question.storySections.length} reviewed sections ·{" "}
            {question.references.length} references
          </p>
          <Link href="/explore">Keep exploring →</Link>
        </aside>
      </div>
      {(question.keyTerms.length > 0 || question.people.length > 0) && (
        <section className="encyclopedic-section">
          <div className="shell encyclopedia-grid">
            <div>
              <span className="eyebrow">Vocabulary</span>
              <h2>Terms that shape the question</h2>
              <div className="term-list">
                {question.keyTerms.map((term) => (
                  <article key={term.term}>
                    <h3>{term.term}</h3>
                    <p>{term.description}</p>
                  </article>
                ))}
              </div>
            </div>
            <div>
              <span className="eyebrow">People in its history</span>
              <h2>Associated with the inquiry</h2>
              <div className="people-list">
                {question.people.map((person) => (
                  <article key={person.name}>
                    <div>
                      <h3>{person.name}</h3>
                      <small>{person.period}</small>
                    </div>
                    <p>{person.association}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
      {question.branches.length > 0 && (
        <section className="branches-section shell">
          <span className="eyebrow">The question opens outward</span>
          <h2>Questions inside the question</h2>
          <div>
            {question.branches.map((branch, index) => (
              <article key={branch.question}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{branch.question}</h3>
                <small>{branch.relationship.replaceAll("_", " ")}</small>
              </article>
            ))}
          </div>
        </section>
      )}
      <section id="timeline" className="timeline-section">
        <div className="shell">
          <span className="eyebrow">Key moments</span>
          <h2>How the asking changed</h2>
          <div className="timeline">
            {question.timeline.map((event, i) => (
              <article key={i}>
                <span>{event.year}</span>
                <h3>{event.title}</h3>
                <p>{event.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section id="connections" className="section shell">
        <div className="section-head">
          <div>
            <span className="eyebrow">Connections</span>
            <h2>Questions this one opens</h2>
          </div>
        </div>
        {related.length ? (
          <div className="question-grid">
            {related.map(({ question: q, edge }) => (
              <div key={q.id} className="related-wrap">
                <span className="relation">
                  {edge.type.replaceAll("_", " ")}
                </span>
                <QuestionCard question={q} />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty relationship-empty">
            <h3>No verified relationships yet.</h3>
            <p>
              This question has no editorially verified connection in the map.
              Tambaya does not substitute unrelated questions.
            </p>
            <Link href="/explore">Explore the wider question map →</Link>
          </div>
        )}
      </section>
      <section id="references" className="references shell">
        <span className="eyebrow">References</span>
        <h2>Sources for the question’s context</h2>
        {question.references.map((ref, i) => (
          <a href={ref.url} target="_blank" rel="noreferrer" key={i}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <div>
              <strong>{ref.title}</strong>
              <small>
                {ref.publisher} ·{" "}
                {ref.purpose.replaceAll("_", " ").toLowerCase()}
              </small>
            </div>
            <b>↗</b>
          </a>
        ))}
      </section>
    </article>
  );
}
