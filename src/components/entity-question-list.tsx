import Link from "next/link";
import type { EntityQuestion } from "@/lib/knowledge-entities";

export function EntityQuestionList({questions}:{questions:EntityQuestion[]}){
  return <div className="entity-question-list">{questions.map(item=><article key={item.slug}>
    <div><span className="eyebrow">{item.category} · {item.status.replaceAll("_"," ")}</span><h2><Link href={`/questions/${item.slug}`}>{item.questionText}</Link></h2></div>
    <p>{item.association}</p>
  </article>)}</div>;
}
