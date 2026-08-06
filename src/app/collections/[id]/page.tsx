import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthDatabase, getCurrentUser } from "@/lib/auth";
import { getCollectionQuestions } from "@/lib/library";

export const metadata: Metadata = { title: "Collection" };
type CollectionRow = { id: string; name: string; description: string };

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [db,{ id }] = await Promise.all([getAuthDatabase(),params]);
  if (!db) redirect("/login");
  const collection = await db.prepare("SELECT id,name,description FROM user_collections WHERE id=? AND user_id=?").bind(id,user.id).first<CollectionRow>();
  if (!collection) notFound();
  const questions = await getCollectionQuestions(db,id,user.id);
  return <div className="page shell collection-page"><nav className="breadcrumbs"><Link href="/account">Your account</Link><span>/</span><span>Collection</span></nav><header className="page-intro"><span className="eyebrow">Private collection</span><h1>{collection.name}</h1><p>{collection.description || "A personal path through Tambaya’s question map."}</p></header><div className="saved-question-list">{questions.map(question => <article key={question.id}><div><small>{question.category_name}</small><h2><Link href={`/questions/${question.slug}`}>{question.question_text}</Link></h2></div><form action={`/api/collections/${id}/questions`} method="post"><input type="hidden" name="questionId" value={question.id}/><input type="hidden" name="action" value="remove"/><input type="hidden" name="returnTo" value={`/collections/${id}`}/><button className="text-button">Remove</button></form></article>)}{!questions.length && <div className="empty"><h2>This collection is waiting for its first question.</h2><p>Open a question and choose this collection from its save controls.</p><Link className="button small" href="/explore">Explore questions</Link></div>}</div></div>;
}
