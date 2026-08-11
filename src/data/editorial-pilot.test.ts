import { describe,expect,it } from "vitest";
import { hasLikelyAnswerLeak } from "@/domain/question";
import { editorialPilot } from "./editorial-pilot";

describe("editorial question pilot",()=>{
  it("contains exactly 25 independently formulated questions",()=>{expect(editorialPilot).toHaveLength(25);expect(new Set(editorialPilot.map(seed=>seed.question)).size).toBe(25);});
  it("covers every public category",()=>expect(new Set(editorialPilot.map(seed=>seed.categorySlug)).size).toBe(13));
  it("avoids repeated openings and endings",()=>{const openings=editorialPilot.map(seed=>seed.question.toLowerCase().split(/\s+/).slice(0,4).join(" "));const endings=editorialPilot.map(seed=>seed.question.toLowerCase().replace(/[^a-z0-9 ]/g,"").split(/\s+/).slice(-3).join(" "));expect(Math.max(...[...new Set(openings)].map(value=>openings.filter(candidate=>candidate===value).length))).toBeLessThanOrEqual(2);expect(new Set(endings).size).toBe(25);});
  it("provides question-specific editorial material without likely answer leakage",()=>{for(const seed of editorialPilot){for(const text of [seed.focus,seed.origins,seed.evolution,seed.stakes]){expect(text.length).toBeGreaterThanOrEqual(120);expect(hasLikelyAnswerLeak(text)).toBe(false);}}});
});
