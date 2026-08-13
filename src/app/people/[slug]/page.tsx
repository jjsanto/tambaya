import {notFound} from "next/navigation";
import {EntityQuestionList} from "@/components/entity-question-list";
import {findPerson} from "@/lib/knowledge-entities";
export const dynamic="force-dynamic";
export default async function PersonPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const person=await findPerson(slug);if(!person)notFound();return <main className="page shell entity-page"><header className="page-intro"><span className="eyebrow">Person in the history of inquiry</span><h1>{person.name}</h1><p>{person.period}</p><p className="lead">{person.bio}</p></header><section><span className="eyebrow">Across Tambaya</span><h2>{person.questions.length} question{person.questions.length===1?"":"s"} shaped by this person</h2><EntityQuestionList questions={person.questions}/></section></main>}
