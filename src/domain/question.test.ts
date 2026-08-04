import { describe, expect, it } from "vitest";
import { hasLikelyAnswerLeak, isAnswerStatus, isRelationshipType, sanitizePublicRecord, slugifyQuestion } from "./question";
describe("question domain", () => {
  it("validates only supported status metadata", () => { expect(isAnswerStatus("OPEN")).toBe(true); expect(isAnswerStatus("SOLVED")).toBe(false); });
  it("validates graph relationships", () => { expect(isRelationshipType("LEADS_TO")).toBe(true); expect(isRelationshipType("ANSWERS")).toBe(false); });
  it("creates stable question slugs", () => { expect(slugifyQuestion("  Is time fundamental? ")).toBe("is-time-fundamental"); });
  it("removes answer-like public fields", () => { expect(sanitizePublicRecord({ question: "Why?", answer: "Because", answer_status: "OPEN" })).toEqual({ question: "Why?", answer_status: "OPEN" }); });
  it("flags explicit answer leaks", () => { expect(hasLikelyAnswerLeak("This proves that one view is correct.")).toBe(true); expect(hasLikelyAnswerLeak("The debate changed how the question was framed.")).toBe(false); });
});
