import {describe,expect,it} from "vitest";
import {editorialBatchOne} from "./editorial-batch-one";
import {editorialPilot} from "./editorial-pilot";
import {questions} from "./questions";
describe("first reviewed expansion batch",()=>{
 it("contains 100 genuinely distinct titles across every category",()=>{expect(editorialBatchOne).toHaveLength(100);expect(new Set(editorialBatchOne.map(seed=>seed.question)).size).toBe(100);expect(new Set(editorialBatchOne.map(seed=>seed.categorySlug)).size).toBe(13);});
 it("does not duplicate the reviewed or public catalogue",()=>{const existing=new Set([...questions.map(question=>question.questionText.toLowerCase()),...editorialPilot.map(seed=>seed.question.toLowerCase())]);for(const seed of editorialBatchOne)expect(existing.has(seed.question.toLowerCase())).toBe(false);});
 it("does not concentrate titles under repeated scaffolds",()=>{const openings=editorialBatchOne.map(seed=>seed.question.toLowerCase().split(/\s+/).slice(0,4).join(" "));const endings=editorialBatchOne.map(seed=>seed.question.toLowerCase().replace(/[^a-z0-9 ]/g,"").split(/\s+/).slice(-3).join(" "));expect(Math.max(...[...new Set(openings)].map(value=>openings.filter(candidate=>candidate===value).length))).toBeLessThanOrEqual(2);expect(Math.max(...[...new Set(endings)].map(value=>endings.filter(candidate=>candidate===value).length))).toBeLessThanOrEqual(2);});
});
