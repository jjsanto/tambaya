import type { Metadata } from "next";
import Link from "next/link";
import { QuestionGrid } from "@/components/question-grid";
import { getQuestionRepository } from "@/data/question-service";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const repository = await getQuestionRepository();
  const [results, categories, tags] = await Promise.all([repository.search(q), repository.categories(), repository.tags()]);
  return <div className="page shell"><header className="page-intro compact"><span className="eyebrow">Search the map</span><h1>Find a question</h1><form className="large-search"><input autoFocus name="q" defaultValue={q} placeholder="Try “consciousness” or “language”…"/><button className="button">Search →</button></form>{q && <p>{results.length} result{results.length === 1 ? "" : "s"} for “{q}”</p>}</header>{results.length > 0 && <QuestionGrid questions={results} highlight={q}/>} {q && !results.length && <div className="empty search-empty"><h2>No question found—yet.</h2><p>Try a broader term, browse a field, or follow one of the active tags below.</p><div className="suggestion-links">{categories.slice(0,4).map(category => <Link href={`/explore?category=${category.slug}`} key={category.slug}>{category.name}</Link>)}{tags.slice(0,6).map(tag => <Link href={`/explore?tag=${tag.slug}`} key={tag.slug}>#{tag.name}</Link>)}</div><p className="search-examples">Other searches to try: <Link href="/search?q=history">history</Link>, <Link href="/search?q=meaning">meaning</Link>, <Link href="/search?q=technology">technology</Link>.</p></div>}</div>;
}
