import type { PublicQuestion } from "@/domain/question";
import { QuestionCard } from "./question-card";
export function QuestionGrid({ questions }: { questions: PublicQuestion[] }) { return <div className="question-grid">{questions.map((q, i) => <QuestionCard question={q} index={i} key={q.id}/>)}</div>; }
