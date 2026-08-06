import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthDatabase, getCurrentUser } from "@/lib/auth";
import { getCollectionQuestions } from "@/lib/library";

export const metadata: Metadata = { title: "Collection" };
type CollectionRow = { id: string; name: string; description: string };
type CollectionParams = { error?: string; updated?: string };

export default async function CollectionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<CollectionParams> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [db,{ id },query] = await Promise.all([getAuthDatabase(),params,searchParams]);
  if (!db) redirect("/login");
  const collection = await db.prepare("SELECT id,name,description FROM user_collections WHERE id=? AND user_id=?").bind(id,user.id).first<CollectionRow>();
  if (!collection) notFound();
  const questions = await getCollectionQuestions(db,id,user.id);
  const error = query.error === "duplicate" ? "You already have a collection with that name." : query.error ? "Use a name of 1–60 characters and a description under 240 characters." : "";
  return <div className="page shell collection-page"><nav className="breadcrumbs"><Link href="/account">Your account</Link><span>/</span><span>Collection</span></nav><header className="page-intro"><span className="eyebrow">Private collection</span><h1>{collection.name}</h1><p>{collection.description || "A personal path through Tambaya’s question map."}</p></header>{query.updated && <p className="auth-success" role="status">Collection details updated.</p>}{error && <p className="auth-error" role="alert">{error}</p>}<details className="collection-editor"><summary>Edit collection details</summary><form action={`/api/collections/${id}`} method="post" className="collection-form"><input type="hidden" name="action" value="update"/><label>Name<input name="name" defaultValue={collection.name} required maxLength={60}/></label><label>Description<textarea name="description" defaultValue={collection.description} maxLength={240} rows={3}/></label><button className="button small">Save changes</button></form></details><div className="saved-question-list">{questions.map(question => <article key={question.id}><div><small>{question.category_name}</small><h2><Link href={`/questions/${question.slug}`}>{question.question_text}</Link></h2></div><form action={`/api/collections/${id}/questions`} method="post"><input type="hidden" name="questionId" value={question.id}/><input type="hidden" name="action" value="remove"/><input type="hidden" name="returnTo" value={`/collections/${id}`}/><button className="text-button">Remove</button></form></article>)}{!questions.length && <div className="empty"><h2>This collection is waiting for its first question.</h2><p>Open a question and choose this collection from its save controls.</p><Link className="button small" href="/explore">Explore questions</Link></div>}</div></div>;
}
