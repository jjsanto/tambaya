import { notFound } from "next/navigation";
import { QuestionGrid } from "@/components/question-grid";
import { getQuestionRepository } from "@/data/question-service";
export const dynamic = "force-dynamic";
export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const repository = await getQuestionRepository(); const [allCategories, items] = await Promise.all([repository.categories(), repository.list({ category: slug })]); const category = allCategories.find(c => c.slug === slug); if (!category) notFound(); return <div className="page shell"><header className="page-intro"><span className="eyebrow">Field of inquiry</span><h1>{category.name}</h1><p>{items.length} questions tracing the edges, histories, and changing language of {category.name.toLowerCase()}.</p></header><QuestionGrid questions={items}/></div>; }
