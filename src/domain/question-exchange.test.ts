import { describe, expect, it } from "vitest";
import {
  buildQuestionAgentBrief,
  parseQuestionSpecification,
} from "./question-exchange";

const specification = {
  contextSummary:
    "Across intellectual history, this question has been reformulated as vocabularies, institutions, methods, and public concerns changed. Its boundaries remain disputed among disciplines, while its significance lies in organizing continuing inquiry without presuming that the central issue has already been resolved.",
  categoryId: "philosophy",
  verifiedStatus: "OPEN" as const,
  sections: Array.from({ length: 5 }, (_, index) => ({
    key: `section-${index + 1}`,
    kicker: "History",
    title: `Framing ${index + 1}`,
    paragraphs: [
      "Researchers and writers have approached this framing through changing vocabularies, institutions, methods, and assumptions that continue to define the question's contested boundaries.",
    ],
  })),
  timeline: Array.from({ length: 3 }, (_, index) => ({
    displayDate: `${1900 + index}`,
    title: `Milestone ${index + 1}`,
    description:
      "New methods and institutions changed who could formulate this question and which forms of evidence could be considered relevant to its continuing history.",
  })),
  keyTerms: [],
  answerAttempts: [],
  relationships: [],
};
const constraints = {
  questionId: "q-1",
  categoryIds: new Set(["philosophy"]),
  relationshipTargets: new Map<string, { slug: string; questionText: string }>(),
};

describe("question specification exchange", () => {
  it("exports the current specification and exact response contract", () => {
    const brief = buildQuestionAgentBrief({
      questionId: "q-1",
      questionTitle: "What is consciousness?",
      currentSpecification: specification,
      categories: [{ id: "philosophy", name: "Philosophy" }],
      relationshipCandidates: [],
    });
    expect(brief.protocol).toBe("tambaya.question-specification");
    expect(brief.currentSpecification.sections).toHaveLength(5);
    expect(brief.responseContract.questionId).toBe("q-1");
  });

  it("imports bare or fenced agent JSON for the current question", () => {
    const raw = `\`\`\`json\n${JSON.stringify({ questionId: "q-1", specification })}\n\`\`\``;
    expect(parseQuestionSpecification(raw, constraints).categoryId).toBe("philosophy");
  });

  it("rejects a specification generated for another question", () => {
    expect(() =>
      parseQuestionSpecification(
        JSON.stringify({ questionId: "q-2", specification }),
        constraints,
      ),
    ).toThrow("different question");
  });
});
