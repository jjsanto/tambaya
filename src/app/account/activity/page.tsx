import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthDatabase, getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Your activity" };
type QuestionRow = { id: string; slug: string; question_text: string; category_name: string; detail: number; happened_at: string };
type CategoryRow = { id: string; slug: string; name: string; followed_at: string };
type RecommendationRow = { id: string; slug: string; question_text: string; category_name: string; score: number; rating_average: number; rating_count: number; relationship_score: number };

function QuestionList({ rows, empty, detail }: { rows: QuestionRow[]; empty: string; detail: (row: QuestionRow) => string }) {
  return <div className="activity-list">{rows.map(row => <article key={row.id}><div><small>{row.category_name}</small><h3><Link href={`/questions/${row.slug}`}>{row.question_text}</Link></h3><span>{detail(row)}</span></div><time>{new Date(row.happened_at.replace(" ","T")+"Z").toLocaleDateString("en-GB")}</time></article>)}{!rows.length&&<p className="empty compact-empty">{empty}</p>}</div>;
}

export default async function ActivityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = await getAuthDatabase();
  if (!db) redirect("/login");
  const [recent,followed,rated,categories,recommendations] = await Promise.all([
    db.prepare("SELECT q.id,q.slug,q.question_text,COALESCE(c.name,q.category_name,'Uncategorised') category_name,v.view_count detail,v.last_viewed_at happened_at FROM user_question_views v JOIN questions q ON q.id=v.question_id LEFT JOIN categories c ON c.id=q.category_id WHERE v.user_id=? AND q.publication_state='PUBLISHED' ORDER BY v.last_viewed_at DESC LIMIT 12").bind(user.id).all<QuestionRow>(),
    db.prepare("SELECT q.id,q.slug,q.question_text,COALESCE(c.name,q.category_name,'Uncategorised') category_name,1 detail,f.created_at happened_at FROM user_question_follows f JOIN questions q ON q.id=f.question_id LEFT JOIN categories c ON c.id=q.category_id WHERE f.user_id=? AND q.publication_state='PUBLISHED' ORDER BY f.created_at DESC").bind(user.id).all<QuestionRow>(),
    db.prepare("SELECT q.id,q.slug,q.question_text,COALESCE(c.name,q.category_name,'Uncategorised') category_name,r.rating detail,r.updated_at happened_at FROM question_ratings r JOIN questions q ON q.id=r.question_id LEFT JOIN categories c ON c.id=q.category_id WHERE r.user_id=? AND q.publication_state='PUBLISHED' ORDER BY r.updated_at DESC").bind(user.id).all<QuestionRow>(),
    db.prepare("SELECT c.id,c.slug,c.name,f.created_at followed_at FROM user_category_follows f JOIN categories c ON c.id=f.category_id WHERE f.user_id=? ORDER BY f.created_at DESC").bind(user.id).all<CategoryRow>(),
    db.prepare(`WITH interest AS (
      SELECT category_id,6 weight FROM user_category_follows WHERE user_id=?
      UNION ALL SELECT q.category_id,MIN(v.view_count,3) FROM user_question_views v JOIN questions q ON q.id=v.question_id WHERE v.user_id=?
      UNION ALL SELECT q.category_id,r.rating FROM question_ratings r JOIN questions q ON q.id=r.question_id WHERE r.user_id=?
      UNION ALL SELECT q.category_id,3 FROM user_bookmarks b JOIN questions q ON q.id=b.question_id WHERE b.user_id=?
    ), category_scores AS (SELECT category_id,SUM(weight) score FROM interest WHERE category_id IS NOT NULL GROUP BY category_id),
    related AS (
      SELECT r.target_question_id question_id,COUNT(*)*4 score FROM question_relationships r JOIN user_question_views v ON v.question_id=r.source_question_id WHERE v.user_id=? AND r.verified=1 GROUP BY r.target_question_id
      UNION ALL SELECT r.source_question_id,COUNT(*)*4 FROM question_relationships r JOIN user_question_views v ON v.question_id=r.target_question_id WHERE v.user_id=? AND r.verified=1 GROUP BY r.source_question_id
    ), relationship_scores AS (SELECT question_id,SUM(score) score FROM related GROUP BY question_id)
    SELECT q.id,q.slug,q.question_text,COALESCE(c.name,q.category_name,'Uncategorised') category_name,
      COALESCE(cs.score,0)+COALESCE(rs.score,0)+COALESCE((SELECT AVG(qr.rating) FROM question_ratings qr WHERE qr.question_id=q.id),0) score,
      COALESCE((SELECT AVG(qr.rating) FROM question_ratings qr WHERE qr.question_id=q.id),0) rating_average,
      (SELECT COUNT(*) FROM question_ratings qr WHERE qr.question_id=q.id) rating_count,COALESCE(rs.score,0) relationship_score
    FROM questions q LEFT JOIN categories c ON c.id=q.category_id LEFT JOIN category_scores cs ON cs.category_id=q.category_id LEFT JOIN relationship_scores rs ON rs.question_id=q.id
    WHERE q.publication_state='PUBLISHED' AND NOT EXISTS (SELECT 1 FROM user_question_views v WHERE v.user_id=? AND v.question_id=q.id)
    ORDER BY score DESC,q.published_at DESC LIMIT 6`).bind(user.id,user.id,user.id,user.id,user.id,user.id,user.id).all<RecommendationRow>(),
  ]);
  return <div className="page shell activity-page">
    <nav className="breadcrumbs"><Link href="/account">My Space</Link><span>/</span><span>Activity</span></nav>
    <header className="page-intro"><span className="eyebrow">Your Tambaya</span><h1>Continue exploring</h1><p>Your private history and interests. These signals are visible only to you and shape the recommendations below.</p></header>
    <section className="recommendation-section"><span className="eyebrow">Recommended for you</span><h2>Where your curiosity could lead next</h2><p className="recommendation-note">Based privately on categories and questions you follow, ratings, bookmarks, reading history, and verified question relationships.</p><div className="recommendation-grid">{(recommendations.results??[]).map(item=><article key={item.id}><small>{item.category_name}</small><h3><Link href={`/questions/${item.slug}`}>{item.question_text}</Link></h3><p>{item.relationship_score>0?"Connected to a question you explored.":item.score>item.rating_average?"Matches fields you have shown interest in.":"A well-regarded question to broaden your map."}</p>{item.rating_count>0&&<span>★ {Number(item.rating_average).toFixed(1)} · {item.rating_count} rating{item.rating_count===1?"":"s"}</span>}</article>)}</div></section>
    <section><span className="eyebrow">Recently viewed</span><h2>Pick up where you left off</h2><QuestionList rows={recent.results??[]} empty="Questions you spend time reading will appear here." detail={row=>`${row.detail} view${row.detail===1?"":"s"}`}/></section>
    <div className="activity-columns"><section><span className="eyebrow">Following</span><h2>Questions</h2><QuestionList rows={followed.results??[]} empty="You are not following any questions yet." detail={()=>"Following"}/></section><section><span className="eyebrow">Following</span><h2>Categories</h2><div className="activity-list">{(categories.results??[]).map(category=><article key={category.id}><div><small>Field of inquiry</small><h3><Link href={`/categories/${category.slug}`}>{category.name}</Link></h3></div></article>)}{!(categories.results??[]).length&&<p className="empty compact-empty">You are not following any categories yet.</p>}</div></section></div>
    <section><span className="eyebrow">Your ratings</span><h2>Questions you evaluated</h2><QuestionList rows={rated.results??[]} empty="You have not rated any questions yet." detail={row=>`${row.detail} out of 5 stars`}/></section>
  </div>;
}
