import { countWords, hasLikelyAnswerLeak, isAnswerStatus } from "@/domain/question";
import { isUsefulKeyTermDescription } from "@/domain/enrichment";

export type EditorialQualityBlocker = {
  code: string;
  label: string;
  message: string;
  anchor: string;
};

export type EditorialQualityInput = {
  contextSummary: string;
  verifiedStatus: string | null;
  sections: { paragraphs: string[] }[];
  timeline: { displayDate: string; title: string; description: string }[];
  keyTerms: { term: string; description: string }[];
  verifiedSourceCount: number;
  pendingConnectionCount: number;
};

export function evaluateEditorialQuality(input: EditorialQualityInput) {
  const blockers: EditorialQualityBlocker[] = [];
  const add = (
    code: string,
    label: string,
    message: string,
    anchor: string,
  ) => blockers.push({ code, label, message, anchor });

  const summary = input.contextSummary.trim();
  if (
    summary.length < 150 ||
    countWords(summary) > 60 ||
    hasLikelyAnswerLeak(summary)
  )
    add(
      "SUMMARY",
      "Context summary",
      "Use 150 or more characters and no more than 60 words, without answering the question.",
      "quality-summary",
    );

  if (!isAnswerStatus(input.verifiedStatus))
    add(
      "STATUS",
      "Answer status",
      "Review and select the question's answer status.",
      "quality-status",
    );

  if (input.sections.length < 5)
    add(
      "STORY_COUNT",
      "Story depth",
      "Add at least five substantial Story sections.",
      "quality-story",
    );
  else if (
    input.sections.some((section) => {
      const text = section.paragraphs.join(" ").trim();
      return text.length < 80 || hasLikelyAnswerLeak(text);
    })
  )
    add(
      "STORY_CONTENT",
      "Story depth",
      "Every Story section needs at least 80 characters of answer-free context.",
      "quality-story",
    );

  if (input.timeline.length < 3)
    add(
      "TIMELINE_COUNT",
      "Question history",
      "Add at least three historical timeline events.",
      "quality-timeline",
    );
  else if (
    input.timeline.some(
      (event) =>
        !event.displayDate.trim() ||
        event.title.trim().length < 4 ||
        event.description.trim().length < 60 ||
        hasLikelyAnswerLeak(event.description),
    )
  )
    add(
      "TIMELINE_CONTENT",
      "Question history",
      "Every timeline event needs a date, title, and at least 60 answer-free characters.",
      "quality-timeline",
    );

  if (input.verifiedSourceCount < 1)
    add(
      "SOURCES",
      "Verified source",
      "Approve at least one credible HTTPS source before publication.",
      "answer-attempt-editor",
    );

  const normalizedTerms = input.keyTerms.map((item) => item.term.trim().toLowerCase());
  if (
    input.keyTerms.some(
      (item) =>
        item.term.trim().length < 2 ||
        item.term.trim().length > 80 ||
        !isUsefulKeyTermDescription(item.description),
    ) ||
    new Set(normalizedTerms).size !== normalizedTerms.length
  )
    add(
      "KEY_TERMS",
      "Key terms",
      "Remove generic or duplicate terms, or give every supplied term a specific answer-free definition of at least 80 characters.",
      "quality-terms",
    );

  if (input.pendingConnectionCount > 0)
    add(
      "CONNECTIONS",
      "Connections",
      "Approve or remove every proposed connection.",
      "quality-connections",
    );

  return { ready: blockers.length === 0, blockers };
}
