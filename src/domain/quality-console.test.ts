import {describe,expect,it} from "vitest";
import {evaluateQualityConsole} from "./quality-console";

const complete={contextSummary:"Across several intellectual traditions, this question has changed as methods, institutions, and public concerns changed. Its vocabulary remains contested, its boundaries differ among disciplines, and its importance lies in how those disagreements organize continuing inquiry without settling the underlying issue.",sectionCount:6,timelineCount:4,termCount:4,sourceCount:3,citationCount:6,relationshipCount:3,verifiedStatus:"OPEN",verificationState:"VERIFIED",publicationState:"PUBLISHED",hasPendingRevision:false};
describe("evaluateQualityConsole",()=>{
  it("assigns a transparent reviewed tier to complete verified records",()=>{const result=evaluateQualityConsole(complete);expect(result.tier).toBe("EDITORIALLY_REVIEWED");expect(result.score).toBeGreaterThanOrEqual(85);expect(result.findings).toEqual([]);});
  it("prioritises shallow unsupported records",()=>{const result=evaluateQualityConsole({...complete,contextSummary:"The answer is obvious.",sectionCount:1,timelineCount:0,termCount:0,sourceCount:0,citationCount:0,relationshipCount:0,verificationState:"PENDING",publicationState:"DRAFT"});expect(result.tier).toBe("GENERATED");expect(result.findings.map(item=>item.code)).toContain("POSSIBLE_ANSWER_LEAK");expect(result.riskScore).toBeGreaterThan(80);});
});
