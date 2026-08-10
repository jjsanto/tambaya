import { describe, expect, it } from "vitest";
import { parseEnrichmentProposal } from "./enrichment";

const proposal = {
  contextSummary:
    "Across periods and disciplines, this question has accumulated several vocabularies, research traditions, and methodological disputes. Its history helps explain why the boundaries of the inquiry remain consequential without settling the matter itself.",
  timeline: [1, 2, 3].map((index) => ({
    displayDate: `Period ${index}`,
    title: `A shift in framing ${index}`,
    description:
      "Writers and researchers began framing the inquiry through a different vocabulary, audience, and set of methods while keeping its central uncertainty visible.",
  })),
  sections: [1, 2, 3].map((index) => ({
    key: `part-${index}`,
    kicker: "Historical context",
    title: `A field of inquiry ${index}`,
    paragraph:
      "Researchers have framed this question in changing ways across several disciplines, periods, and institutions, making its vocabulary and boundaries part of the history of inquiry.",
    listItems: ["A tradition to investigate"],
    callout: "This proposal maps the question without resolving it.",
  })),
  suggestedStatus: "OPEN",
  statusConfidence: "LOW",
  statusRationale:
    "The available framing suggests that editorial verification should concentrate on whether an established consensus exists elsewhere.",
  sourceLeads: [],
  answerAttempts: [
    {
      title: "A historical investigation",
      author: "A. Researcher",
      publisher: "Example University Press",
      url: "https://example.edu/historical-investigation",
      publicationDate: "1975",
      approach:
        "The work reframed the inquiry through a newly formalized experimental method.",
      scope:
        "It concentrated on one measurable dimension within the broader question.",
      significance:
        "Later researchers adopted its vocabulary and debated the limits of its method.",
      unresolved:
        "Other dimensions and competing interpretations remained beyond the study's stated scope.",
    },
  ],
  relationships: [
    {
      targetId: "q-2",
      targetSlug: "related-question",
      targetQuestion: "What is related?",
      type: "RELATED_TO",
      confidence: 0.82,
      rationale: "Both questions examine adjacent concepts.",
    },
  ],
};

describe("enrichment proposals", () => {
  it("normalizes safe proposals into rich Story sections", () => {
    const result = parseEnrichmentProposal(proposal);
    expect(result.sections).toHaveLength(3);
    expect(result.timeline).toHaveLength(3);
    expect(result.answerAttempts).toHaveLength(1);
    expect(result.sections[0].blocks).toHaveLength(3);
  });
  it("rejects answer leakage before it reaches the editor", () => {
    const unsafe = structuredClone(proposal);
    unsafe.sections[0].paragraph =
      "The definitive answer is something the public page should never reveal, despite this otherwise sufficiently long paragraph for validation.";
    expect(() => parseEnrichmentProposal(unsafe)).toThrow(/rejected/);
  });
  it("normalizes typed relationship proposals", () => {
    expect(parseEnrichmentProposal(proposal).relationships[0]).toMatchObject({
      targetId: "q-2",
      type: "RELATED_TO",
      confidence: 0.82,
    });
  });
  it("keeps bibliographic attempts that still need URL verification", () => {
    const withoutUrl = structuredClone(proposal);
    withoutUrl.answerAttempts[0].url = "";
    const result = parseEnrichmentProposal(withoutUrl);
    expect(result.answerAttempts).toHaveLength(1);
    expect(result.answerAttempts[0].url).toBe("");
    expect(result.warnings.join(" ")).toMatch(/verified HTTPS source/);
  });
  it("rejects an enrichment without a publishable context summary", () => {
    expect(() =>
      parseEnrichmentProposal({ ...proposal, contextSummary: "Too short" }),
    ).toThrow(/summary/);
  });
});
