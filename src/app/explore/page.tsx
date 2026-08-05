import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { QuestionGrid } from "@/components/question-grid";
import { getQuestionRepository } from "@/data/question-service";
import type { QuestionSort } from "@/data/repository";

export const metadata: Metadata = { title: "Explore questions" };
const pageSize = 6;
type ExploreParams = { status?: string; category?: string; tag?: string; sort?: QuestionSort; page?: string };

function exploreHref(filter: ExploreParams, page?: number) {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.category) params.set("category", filter.category);
  if (filter.tag) params.set("tag", filter.tag);
  if (filter.sort && filter.sort !== "newest") params.set("sort", filter.sort);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/explore${query ? `?${query}` : ""}`;
}

export default async function ExplorePage({ searchParams }: { searchParams: Promise<ExploreParams> }) {
  const filter = await searchParams;
  const repository = await getQuestionRepository();
  const validSort: QuestionSort = ["newest", "recently-verified", "most-connected"].includes(filter.sort ?? "") ? filter.sort as QuestionSort : "newest";
  const activeFilter = { status: filter.status, category: filter.category, tag: filter.tag, sort: validSort };
  const [total, categories, tags] = await Promise.all([repository.count(activeFilter), repository.categories(), repository.tags()]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const requestedPage = Number.parseInt(filter.page ?? "1", 10);
  const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), totalPages);
  const results = await repository.list({ ...activeFilter, page: currentPage, pageSize });
  const firstResult = total ? (currentPage - 1) * pageSize + 1 : 0;
  const lastResult = Math.min(currentPage * pageSize, total);
  return <div className="page shell"><section className="explore-hero"><header className="page-intro"><span className="eyebrow">Explore Tambaya</span><h1>Questions have paths.<br/><em>Choose one to follow.</em></h1><p>Browse a curated field of questions, their histories, and the connections between them.</p></header><Image className="explore-meerkat" src="/images/tambaya-meerkat-explore-path.png" width={1536} height={1024} priority sizes="(max-width: 900px) 92vw, 48vw" alt="A curious meerkat follows a winding path of connected questions"/></section><form className="discovery-controls" action="/explore"><label>Category<select name="category" defaultValue={filter.category ?? ""}><option value="">All categories</option>{categories.map(category => <option value={category.slug} key={category.slug}>{category.name} ({category.count})</option>)}</select></label><label>Status<select name="status" defaultValue={filter.status ?? ""}><option value="">All statuses</option><option value="OPEN">Open</option><option value="PARTIALLY_ANSWERED">Partially answered</option><option value="ANSWERED">Answered</option></select></label><label>Tag<select name="tag" defaultValue={filter.tag ?? ""}><option value="">All tags</option>{tags.map(tag => <option value={tag.slug} key={tag.slug}>{tag.name} ({tag.count})</option>)}</select></label><label>Sort by<select name="sort" defaultValue={validSort}><option value="newest">Newest</option><option value="recently-verified">Recently verified</option><option value="most-connected">Most connected</option></select></label><button className="button small">Apply</button><Link className="clear-filters" href="/explore">Clear</Link></form><div className="filter-bar"><div><Link href={exploreHref({ ...activeFilter, status: undefined })}>All</Link><Link href={exploreHref({ ...activeFilter, status: "OPEN" })}>Open</Link><Link href={exploreHref({ ...activeFilter, status: "PARTIALLY_ANSWERED" })}>Partially answered</Link><Link href={exploreHref({ ...activeFilter, status: "ANSWERED" })}>Answered</Link></div><span>{firstResult}–{lastResult} of {total} questions</span></div>{results.length ? <><QuestionGrid questions={results}/>{totalPages > 1 && <nav className="pagination" aria-label="Question pages"><Link className={currentPage === 1 ? "disabled" : ""} aria-disabled={currentPage === 1} href={exploreHref(activeFilter, currentPage - 1)}>← Previous</Link><div>{Array.from({ length: totalPages }, (_, index) => index + 1).map(page => <Link className={page === currentPage ? "active" : ""} aria-current={page === currentPage ? "page" : undefined} href={exploreHref(activeFilter, page)} key={page}>{page}</Link>)}</div><Link className={currentPage === totalPages ? "disabled" : ""} aria-disabled={currentPage === totalPages} href={exploreHref(activeFilter, currentPage + 1)}>Next →</Link></nav>}</> : <div className="empty"><h2>No questions match this combination.</h2><p>Remove one filter, choose a broader tag, or return to the complete question map.</p><Link className="button small" href="/explore">Clear all filters</Link></div>}</div>;
}
