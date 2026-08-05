import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { QuestionGrid } from "@/components/question-grid";
import { categoryIllustrations } from "@/data/category-illustrations";
import { getQuestionRepository } from "@/data/question-service";
export const dynamic = "force-dynamic";

const pageSize = 6;

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> }) {
  const { slug } = await params;
  const { page } = await searchParams;
  const repository = await getQuestionRepository();
  const [allCategories, total] = await Promise.all([repository.categories(), repository.count({ category: slug })]);
  const category = allCategories.find(item => item.slug === slug);
  if (!category) notFound();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const requestedPage = Number.parseInt(page ?? "1", 10);
  const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), totalPages);
  const items = await repository.list({ category: slug, page: currentPage, pageSize });
  const pageHref = (target: number) => `/categories/${slug}${target > 1 ? `?page=${target}` : ""}`;
  return <div className="page shell"><section className="category-detail-hero"><header className="page-intro"><span className="eyebrow">Field of inquiry</span><h1>{category.name}</h1><p>{total} questions tracing the edges, histories, and changing language of {category.name.toLowerCase()}.</p></header><Image className="category-detail-meerkat" src={categoryIllustrations[slug] ?? "/images/tambaya-meerkat-categories.png"} width={1536} height={1024} priority sizes="(max-width: 900px) 92vw, 48vw" alt={`A curious meerkat explores ${category.name}`}/></section><QuestionGrid questions={items}/>{totalPages > 1 && <nav className="pagination" aria-label={`${category.name} question pages`}><Link className={currentPage === 1 ? "disabled" : ""} aria-disabled={currentPage === 1} href={pageHref(currentPage - 1)}>← Previous</Link><div>{Array.from({ length: totalPages }, (_, index) => index + 1).map(target => <Link className={target === currentPage ? "active" : ""} aria-current={target === currentPage ? "page" : undefined} href={pageHref(target)} key={target}>{target}</Link>)}</div><Link className={currentPage === totalPages ? "disabled" : ""} aria-disabled={currentPage === totalPages} href={pageHref(currentPage + 1)}>Next →</Link></nav>}</div>;
}
