import type { Metadata } from "next";
import Link from "next/link";
import { QuestionGrid } from "@/components/question-grid";
import { getQuestionRepository } from "@/data/question-service";
export const metadata: Metadata = { title: "Explore questions" };
export default function ExplorePage({ searchParams }: { searchParams: Promise<{ status?: string; category?: string }> }) {
  return <Explore searchParams={searchParams}/>;
}
async function Explore({ searchParams }: { searchParams: Promise<{ status?: string; category?: string }> }) {
  const filter = await searchParams;
  const repository = await getQuestionRepository();
  const [results, categories] = await Promise.all([repository.list(filter), repository.categories()]);
  return <div className="page shell"><header className="page-intro"><span className="eyebrow">Explore Tambaya</span><h1>Questions have paths.<br/><em>Choose one to follow.</em></h1><p>Browse a curated field of questions, their histories, and the connections between them.</p></header><div className="filter-bar"><div><Link href="/explore">All</Link><Link href="/explore?status=OPEN">Open</Link><Link href="/explore?status=PARTIALLY_ANSWERED">Partially answered</Link><Link href="/explore?status=ANSWERED">Answered</Link></div><span>{results.length} questions</span></div><div className="explore-layout"><aside><strong>Fields of inquiry</strong>{categories.map(c => <Link href={`/explore?category=${c.slug}`} key={c.slug}>{c.name}<span>{c.count}</span></Link>)}</aside><QuestionGrid questions={results}/></div></div>;
}
