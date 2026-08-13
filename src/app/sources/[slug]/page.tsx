import {notFound} from "next/navigation";
import {EntityQuestionList} from "@/components/entity-question-list";
import {findSource} from "@/lib/knowledge-entities";
export const dynamic="force-dynamic";
export default async function SourcePage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const source=await findSource(slug);if(!source)notFound();return <main className="page shell entity-page"><header className="page-intro"><span className="eyebrow">Shared source · {source.type}</span><h1>{source.title}</h1><p>{source.publisher}</p><a className="button ghost" href={source.url} target="_blank" rel="noreferrer">Visit original source ↗</a></header><section><span className="eyebrow">Cited by Tambaya</span><h2>Questions using this source</h2><EntityQuestionList questions={source.questions}/></section></main>}
