import { describe, expect, it } from "vitest";
import { evaluateEditorialQuality, type EditorialQualityInput } from "./editorial-quality";

const paragraph =
  "Scholars have framed this question through changing historical vocabularies, institutions, methods, and assumptions whose disagreements continue to shape its present significance.";
const valid: EditorialQualityInput = {
  contextSummary:
    "Across several intellectual traditions, this question has changed as methods, institutions, and public concerns changed. Its vocabulary remains contested, its boundaries differ among disciplines, and its importance lies in how those disagreements organize continuing inquiry without settling the underlying issue.",
  verifiedStatus: "OPEN",
  sections: Array.from({ length: 5 }, () => ({ paragraphs: [paragraph] })),
  timeline: Array.from({ length: 3 }, (_, index) => ({
    displayDate: `${1900 + index}`,
    title: `Framing ${index + 1}`,
    description: paragraph,
  })),
  keyTerms: [],
  verifiedSourceCount: 1,
  pendingConnectionCount: 0,
};

describe("evaluateEditorialQuality", () => {
  it("accepts a complete answer-free working copy without key terms", () => {
    expect(evaluateEditorialQuality(valid)).toEqual({ ready: true, blockers: [] });
  });

  it("returns all actionable blockers rather than stopping at the first", () => {
    const result = evaluateEditorialQuality({
      ...valid,
      contextSummary: "Too short.",
      sections: valid.sections.slice(0, 2),
      timeline: [],
      verifiedSourceCount: 0,
      pendingConnectionCount: 2,
    });
    expect(result.ready).toBe(false);
    expect(result.blockers.map((blocker) => blocker.code)).toEqual([
      "SUMMARY",
      "STORY_COUNT",
      "TIMELINE_COUNT",
      "SOURCES",
      "CONNECTIONS",
    ]);
  });

  it("allows key terms to be absent but rejects generic supplied definitions", () => {
    const result = evaluateEditorialQuality({
      ...valid,
      keyTerms: [{ term: "Meaning", description: "A central concept." }],
    });
    expect(result.blockers.map((blocker) => blocker.code)).toContain("KEY_TERMS");
  });
});
