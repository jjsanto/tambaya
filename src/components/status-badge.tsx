import type { AnswerStatus, VerificationState } from "@/domain/question";
const label = { ANSWERED: "Answered", PARTIALLY_ANSWERED: "Partially answered", OPEN: "Open" };
export function StatusBadge({ status, verification = "VERIFIED" }: { status: AnswerStatus; verification?: VerificationState }) {
  return <span className={`status status-${status.toLowerCase()}`}>{label[status]} {verification === "VERIFIED" && <span title="Verified by Tambaya">✓</span>}</span>;
}
