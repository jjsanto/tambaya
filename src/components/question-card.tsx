import Link from "next/link";
import type { PublicQuestion } from "@/domain/question";
import { StatusBadge } from "./status-badge";

function Highlight({ text, query }: { text: string; query?: string }) { const terms = query?.trim().split(/\s+/).filter(Boolean) ?? []; if (!terms.length) return text; const pattern = new RegExp(`(${terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi"); return text.split(pattern).map((part, index) => terms.some(term => part.toLowerCase() === term.toLowerCase()) ? <mark key={index}>{part}</mark> : part); }

export function QuestionCard({ question, index, highlight }: { question: PublicQuestion; index?: number; highlight?: string }) {
  return <article className="question-card">
    {typeof index === "number" && <span className="card-number">{String(index + 1).padStart(2, "0")}</span>}
    <div className="card-meta"><StatusBadge status={question.verifiedStatus}/><span>{question.category}</span></div>
    <h3><Link href={`/questions/${question.slug}`}><Highlight text={question.questionText} query={highlight}/></Link></h3>
    <p><Highlight text={question.contextSummary} query={highlight}/></p>
    <div className="tag-row">{question.tags.slice(0, 3).map(tag => <span key={tag}>#<Highlight text={tag} query={highlight}/></span>)}</div>
    <Link href={`/questions/${question.slug}`} className="text-link">Read the story <span>→</span></Link>
  </article>;
}
