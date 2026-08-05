import type { PublicQuestion } from "@/domain/question";
import { QuestionCard } from "./question-card";
export function QuestionGrid({ questions, highlight }: { questions: PublicQuestion[]; highlight?: string }) { return <div className="question-grid">{questions.map((q, i) => <QuestionCard question={q} index={i} highlight={highlight} key={q.id}/>)}</div>; }
