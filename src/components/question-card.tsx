import Link from "next/link";
import type { PublicQuestion } from "@/domain/question";
import { StatusBadge } from "./status-badge";

export function QuestionCard({ question, index }: { question: PublicQuestion; index?: number }) {
  return <article className="question-card">
    {typeof index === "number" && <span className="card-number">{String(index + 1).padStart(2, "0")}</span>}
    <div className="card-meta"><StatusBadge status={question.verifiedStatus}/><span>{question.category}</span></div>
    <h3><Link href={`/questions/${question.slug}`}>{question.questionText}</Link></h3>
    <p>{question.contextSummary}</p>
    <div className="tag-row">{question.tags.slice(0, 3).map(tag => <span key={tag}>#{tag}</span>)}</div>
    <Link href={`/questions/${question.slug}`} className="text-link">Read the story <span>→</span></Link>
  </article>;
}
