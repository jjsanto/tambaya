import {describe,expect,it} from "vitest";
import {parseSubmission,validateForSubmission} from "./submissions";

const paragraph="This section traces how the question emerged, which assumptions shape its wording, and why different fields continue to frame the underlying inquiry in distinct ways without resolving it.";
const valid={questionText:"What makes a question endure?",categoryId:"cat-philosophy",claimedStatus:"OPEN",contextSummary:"This question has persisted across intellectual traditions because it concerns how inquiry selects, preserves, and revisits problems whose significance changes over time without supplying an answer.",tags:["inquiry"],sections:[1,2,3].map(index=>({kicker:"Context",title:`Perspective ${index}`,blocks:[{type:"PARAGRAPH",text:paragraph}]}))};

describe("publisher submissions",()=>{
  it("normalizes all supported rich block types",()=>{const parsed=parseSubmission({...valid,sections:[{kicker:"Evidence",title:"Rich context",blocks:[{type:"PARAGRAPH",text:paragraph},{type:"HEADING",text:"A lens",level:3},{type:"IMAGE",src:"https://example.com/image.jpg",alt:"An archive"},{type:"TABLE",headers:["Period","Framing"],rows:[["Ancient","Foundational"]]},{type:"LIST",style:"ORDERED",items:["First"]},{type:"QUOTE",text:"Questions reorganize attention."},{type:"CALLOUT",tone:"CONTEXT",text:"This is context."}]}]});expect(parsed?.sections[0].blocks.map(block=>block.type)).toEqual(["PARAGRAPH","HEADING","IMAGE","TABLE","LIST","QUOTE","CALLOUT"]);});
  it("requires substantial answer-free content before submission",()=>{const parsed=parseSubmission(valid);expect(parsed&&validateForSubmission(parsed)).toBeNull();const thin=parseSubmission({...valid,contextSummary:"Too short"});expect(thin&&validateForSubmission(thin)).toContain("150");});
  it("rejects malformed questions and unsafe image URLs",()=>{expect(parseSubmission({...valid,questionText:"Not a question"})).toBeNull();const parsed=parseSubmission({...valid,sections:[{kicker:"Context",title:"Images",blocks:[{type:"IMAGE",src:"javascript:alert(1)",alt:"unsafe"}]}]});expect(parsed?.sections[0].blocks).toEqual([]);});
});
