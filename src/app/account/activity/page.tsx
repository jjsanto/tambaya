import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthDatabase, getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Your activity" };
type QuestionRow = { id: string; slug: string; question_text: string; category_name: string; detail: number; happened_at: string };
type CategoryRow = { id: string; slug: string; name: string; followed_at: string };

function QuestionList({ rows, empty, detail }: { rows: QuestionRow[]; empty: string; detail: (row: QuestionRow) => string }) {
  return <div className="activity-list">{rows.map(row => <article key={row.id}><div><small>{row.category_name}</small><h3><Link href={`/questions/${row.slug}`}>{row.question_text}</Link></h3><span>{detail(row)}</span></div><time>{new Date(row.happened_at.replace(" ","T")+"Z").toLocaleDateString("en-GB")}</time></article>)}{!rows.length&&<p className="empty compact-empty">{empty}</p>}</div>;
}

export default async function ActivityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = await getAuthDatabase();
  if (!db) redirect("/login");
  const [recent,followed,rated,categories] = await Promise.all([
    db.prepare("SELECT q.id,q.slug,q.question_text,COALESCE(c.name,q.category_name,'Uncategorised') category_name,v.view_count detail,v.last_viewed_at happened_at FROM user_question_views v JOIN questions q ON q.id=v.question_id LEFT JOIN categories c ON c.id=q.category_id WHERE v.user_id=? AND q.publication_state='PUBLISHED' ORDER BY v.last_viewed_at DESC LIMIT 12").bind(user.id).all<QuestionRow>(),
    db.prepare("SELECT q.id,q.slug,q.question_text,COALESCE(c.name,q.category_name,'Uncategorised') category_name,1 detail,f.created_at happened_at FROM user_question_follows f JOIN questions q ON q.id=f.question_id LEFT JOIN categories c ON c.id=q.category_id WHERE f.user_id=? AND q.publication_state='PUBLISHED' ORDER BY f.created_at DESC").bind(user.id).all<QuestionRow>(),
    db.prepare("SELECT q.id,q.slug,q.question_text,COALESCE(c.name,q.category_name,'Uncategorised') category_name,r.rating detail,r.updated_at happened_at FROM question_ratings r JOIN questions q ON q.id=r.question_id LEFT JOIN categories c ON c.id=q.category_id WHERE r.user_id=? AND q.publication_state='PUBLISHED' ORDER BY r.updated_at DESC").bind(user.id).all<QuestionRow>(),
    db.prepare("SELECT c.id,c.slug,c.name,f.created_at followed_at FROM user_category_follows f JOIN categories c ON c.id=f.category_id WHERE f.user_id=? ORDER BY f.created_at DESC").bind(user.id).all<CategoryRow>(),
  ]);
  return <div className="page shell activity-page"><nav className="breadcrumbs"><Link href="/account">Your account</Link><span>/</span><span>Activity</span></nav><header className="page-intro"><span className="eyebrow">Your Tambaya</span><h1>Continue exploring</h1><p>Your private history and interests. These signals are visible only to you and will shape future recommendations.</p></header><section><span className="eyebrow">Recently viewed</span><h2>Pick up where you left off</h2><QuestionList rows={recent.results??[]} empty="Questions you spend time reading will appear here." detail={row=>`${row.detail} view${row.detail===1?"":"s"}`}/></section><div className="activity-columns"><section><span className="eyebrow">Following</span><h2>Questions</h2><QuestionList rows={followed.results??[]} empty="You are not following any questions yet." detail={()=>"Following"}/></section><section><span className="eyebrow">Following</span><h2>Categories</h2><div className="activity-list">{(categories.results??[]).map(category=><article key={category.id}><div><small>Field of inquiry</small><h3><Link href={`/categories/${category.slug}`}>{category.name}</Link></h3></div></article>)}{!(categories.results??[]).length&&<p className="empty compact-empty">You are not following any categories yet.</p>}</div></section></div><section><span className="eyebrow">Your ratings</span><h2>Questions you evaluated</h2><QuestionList rows={rated.results??[]} empty="You have not rated any questions yet." detail={row=>`${row.detail} out of 5 stars`}/></section></div>;
}
