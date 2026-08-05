import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getQuestionRepository } from "@/data/question-service";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Categories" };
export default async function CategoriesPage() { const repository = await getQuestionRepository(); const [categories, questions] = await Promise.all([repository.categories(), repository.list()]); return <div className="page shell"><section className="categories-hero"><header className="page-intro"><span className="eyebrow">Fields of inquiry</span><h1>Every discipline begins<br/><em>with a question.</em></h1><p>Cross boundaries, follow a familiar field, or step into one you have never explored.</p></header><Image className="categories-meerkat" src="/images/tambaya-meerkat-categories.png" width={1536} height={1024} priority sizes="(max-width: 900px) 92vw, 48vw" alt="A curious meerkat considers branching fields of inquiry"/></section><div className="category-cards">{categories.map((c, index) => <Link href={`/categories/${c.slug}`} key={c.slug}><span>{String(index + 1).padStart(2, "0")}</span><h2>{c.name}</h2><p>{questions.find(q => q.categorySlug === c.slug)?.contextSummary}</p><footer>{c.count} questions <b>Explore →</b></footer></Link>)}</div></div>; }
