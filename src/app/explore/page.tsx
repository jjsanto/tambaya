import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { QuestionGrid } from "@/components/question-grid";
import { getQuestionRepository } from "@/data/question-service";
export const metadata: Metadata = { title: "Explore questions" };
const pageSize = 12;
type ExploreParams = { status?: string; category?: string; page?: string };
function exploreHref(filter: ExploreParams, page?: number) { const params = new URLSearchParams(); if (filter.status) params.set("status", filter.status); if (filter.category) params.set("category", filter.category); if (page && page > 1) params.set("page", String(page)); const query = params.toString(); return `/explore${query ? `?${query}` : ""}`; }
export default function ExplorePage({ searchParams }: { searchParams: Promise<ExploreParams> }) {
  return <Explore searchParams={searchParams}/>;
}
async function Explore({ searchParams }: { searchParams: Promise<ExploreParams> }) {
  const filter = await searchParams;
  const repository = await getQuestionRepository();
  const [total, categories] = await Promise.all([repository.count(filter), repository.categories()]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const requestedPage = Number.parseInt(filter.page ?? "1", 10);
  const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), totalPages);
  const results = await repository.list({ ...filter, page: currentPage, pageSize });
  const firstResult = total ? (currentPage - 1) * pageSize + 1 : 0;
  const lastResult = Math.min(currentPage * pageSize, total);
  return <div className="page shell"><section className="explore-hero"><header className="page-intro"><span className="eyebrow">Explore Tambaya</span><h1>Questions have paths.<br/><em>Choose one to follow.</em></h1><p>Browse a curated field of questions, their histories, and the connections between them.</p></header><Image className="explore-meerkat" src="/images/tambaya-meerkat-explore-path.png" width={1536} height={1024} priority sizes="(max-width: 900px) 92vw, 48vw" alt="A curious meerkat follows a winding path of connected questions"/></section><div className="filter-bar"><div><Link href="/explore">All</Link><Link href={exploreHref({ category: filter.category, status: "OPEN" })}>Open</Link><Link href={exploreHref({ category: filter.category, status: "PARTIALLY_ANSWERED" })}>Partially answered</Link><Link href={exploreHref({ category: filter.category, status: "ANSWERED" })}>Answered</Link></div><span>{firstResult}–{lastResult} of {total} questions</span></div><div className="explore-layout"><aside><strong>Fields of inquiry</strong>{categories.map(c => <Link href={exploreHref({ status: filter.status, category: c.slug })} key={c.slug}>{c.name}<span>{c.count}</span></Link>)}</aside><div><QuestionGrid questions={results}/>{totalPages > 1 && <nav className="pagination" aria-label="Question pages"><Link className={currentPage === 1 ? "disabled" : ""} aria-disabled={currentPage === 1} href={exploreHref(filter, currentPage - 1)}>← Previous</Link><div>{Array.from({ length: totalPages }, (_, index) => index + 1).map(page => <Link className={page === currentPage ? "active" : ""} aria-current={page === currentPage ? "page" : undefined} href={exploreHref(filter, page)} key={page}>{page}</Link>)}</div><Link className={currentPage === totalPages ? "disabled" : ""} aria-disabled={currentPage === totalPages} href={exploreHref(filter, currentPage + 1)}>Next →</Link></nav>}</div></div></div>;
}
