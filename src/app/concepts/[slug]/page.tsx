import {notFound} from "next/navigation";
import {EntityQuestionList} from "@/components/entity-question-list";
import {findConcept} from "@/lib/knowledge-entities";
export const dynamic="force-dynamic";
export default async function ConceptPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const concept=await findConcept(slug);if(!concept)notFound();return <main className="page shell entity-page"><header className="page-intro"><span className="eyebrow">Shared concept</span><h1>{concept.name}</h1><p className="lead">{concept.definition}</p></header><section><span className="eyebrow">Meanings in context</span><h2>{concept.questions.length} connected question{concept.questions.length===1?"":"s"}</h2><EntityQuestionList questions={concept.questions}/></section></main>}
