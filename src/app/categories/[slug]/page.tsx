import { notFound } from "next/navigation";
import Image from "next/image";
import { QuestionGrid } from "@/components/question-grid";
import { getQuestionRepository } from "@/data/question-service";
export const dynamic = "force-dynamic";

const illustrations: Record<string,string> = {
  history: "/images/tambaya-category-history.png",
  mathematics: "/images/tambaya-category-mathematics.png",
  philosophy: "/images/tambaya-category-philosophy.png",
  "psychology-mind": "/images/tambaya-category-psychology-mind.png",
  science: "/images/tambaya-category-science.png",
  society: "/images/tambaya-category-society.png",
  "technology-ai": "/images/tambaya-category-technology-ai.png",
};

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const repository = await getQuestionRepository(); const [allCategories, items] = await Promise.all([repository.categories(), repository.list({ category: slug })]); const category = allCategories.find(c => c.slug === slug); if (!category) notFound(); return <div className="page shell"><section className="category-detail-hero"><header className="page-intro"><span className="eyebrow">Field of inquiry</span><h1>{category.name}</h1><p>{items.length} questions tracing the edges, histories, and changing language of {category.name.toLowerCase()}.</p></header><Image className="category-detail-meerkat" src={illustrations[slug] ?? "/images/tambaya-meerkat-categories.png"} width={1536} height={1024} priority sizes="(max-width: 900px) 92vw, 48vw" alt={`A curious meerkat explores ${category.name}`}/></section><QuestionGrid questions={items}/></div>; }
