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
  people: [],
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
    expect(brief.connectionGuidance.supportedTypes).toHaveLength(7);
    expect(brief.connectionGuidance.sameCategoryQuestions).toEqual([]);
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

  it("imports common external-agent key-term field variants", () => {
    const external = {
      ...specification,
      keyTerms: undefined,
      key_terms: [
        {
          name: "Subjective experience",
          definition:
            "The first-person character of awareness as distinguished from behavioral report or measurement, a distinction that determines which evidence different approaches treat as relevant to the question.",
        },
      ],
    };
    const result = parseQuestionSpecification(
      JSON.stringify({ questionId: "q-1", specification: external }),
      constraints,
    );
    expect(result.keyTerms).toEqual([
      {
        term: "Subjective experience",
        description:
          "The first-person character of awareness as distinguished from behavioral report or measurement, a distinction that determines which evidence different approaches treat as relevant to the question.",
      },
    ]);
  });

  it("rejects malformed key terms instead of silently dropping their content", () => {
    const external = {
      ...specification,
      keyTerms: undefined,
      terms: [{ term: "Subjective experience" }],
    };
    expect(() =>
      parseQuestionSpecification(
        JSON.stringify({ questionId: "q-1", specification: external }),
        constraints,
      ),
    ).toThrow("both a term and a description");
  });

  it("imports key terms represented as Story-shaped title and paragraphs", () => {
    const external = {
      ...specification,
      keyTerms: [
        {
          key: "alternative-biochemistry",
          kicker: "Definition",
          title: "Alternative biochemistry",
          paragraphs: [
            "Chemical systems that differ from Earth's carbon-based biology in their molecular components, reaction pathways, or structural organization while potentially supporting life-like processes through unfamiliar mechanisms.",
          ],
        },
      ],
    };
    const result = parseQuestionSpecification(
      JSON.stringify({ questionId: "q-1", specification: external }),
      constraints,
    );
    expect(result.keyTerms).toEqual([
      {
        term: "Alternative biochemistry",
        description:
          "Chemical systems that differ from Earth's carbon-based biology in their molecular components, reaction pathways, or structural organization while potentially supporting life-like processes through unfamiliar mechanisms.",
      },
    ]);
  });
});
