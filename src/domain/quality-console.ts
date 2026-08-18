import {countWords,hasLikelyAnswerLeak} from "@/domain/question";

export type QualityTier="GENERATED"|"STRUCTURED"|"SOURCE_GROUNDED"|"EDITORIALLY_REVIEWED"|"EXPERT_VERIFIED";
export type QualityDimension="structure"|"sources"|"specificity"|"history"|"connections"|"answerSafety";
export type QualityFinding={code:string;severity:"HIGH"|"MEDIUM"|"LOW";dimension:QualityDimension;message:string;anchor:string};
export type QualityConsoleInput={contextSummary:string;sectionCount:number;timelineCount:number;termCount:number;sourceCount:number;citationCount:number;relationshipCount:number;verifiedStatus:string|null;verificationState:string;publicationState:string;hasPendingRevision:boolean};

const clamp=(value:number)=>Math.max(0,Math.min(100,Math.round(value)));
export function evaluateQualityConsole(input:QualityConsoleInput){
  const findings:QualityFinding[]=[];
  const summaryWords=countWords(input.contextSummary);
  const unsafe=hasLikelyAnswerLeak(input.contextSummary);
  const dimensions:Record<QualityDimension,number>={
    structure:clamp(input.sectionCount/5*70+Math.min(30,input.contextSummary.length/5)),
    sources:clamp(input.sourceCount*35+Math.min(30,input.citationCount*10)),
    specificity:clamp((input.contextSummary.length>=150&&summaryWords<=60?55:20)+Math.min(45,input.termCount*9)),
    history:clamp(input.timelineCount/3*100),
    connections:clamp(input.relationshipCount?70+Math.min(30,input.relationshipCount*5):35),
    answerSafety:unsafe?0:100,
  };
  if(input.sectionCount<5)findings.push({code:"SHALLOW_STORY",severity:"HIGH",dimension:"structure",message:`Only ${input.sectionCount} of five expected Story sections exist.`,anchor:"quality-story"});
  if(input.timelineCount<3)findings.push({code:"THIN_HISTORY",severity:"HIGH",dimension:"history",message:`Only ${input.timelineCount} of three expected historical events exist.`,anchor:"quality-timeline"});
  if(input.sourceCount<1)findings.push({code:"NO_VERIFIED_SOURCE",severity:"HIGH",dimension:"sources",message:"No verified source supports this record.",anchor:"answer-attempt-editor"});
  else if(input.citationCount<Math.min(3,input.sectionCount+input.timelineCount))findings.push({code:"LOW_CITATION_COVERAGE",severity:"MEDIUM",dimension:"sources",message:"Sources exist, but few claims are connected to field-level citations.",anchor:"quality-story"});
  if(input.termCount===0)findings.push({code:"NO_SHARED_CONCEPTS",severity:"LOW",dimension:"specificity",message:"No question-specific concepts provide a second navigation axis.",anchor:"quality-terms"});
  if(input.relationshipCount===0)findings.push({code:"ISOLATED_QUESTION",severity:"MEDIUM",dimension:"connections",message:"The question has no verified graph relationships.",anchor:"quality-connections"});
  if(unsafe)findings.push({code:"POSSIBLE_ANSWER_LEAK",severity:"HIGH",dimension:"answerSafety",message:"The summary may state or imply an answer.",anchor:"quality-summary"});
  if(input.hasPendingRevision)findings.push({code:"UNPUBLISHED_CHANGES",severity:"LOW",dimension:"structure",message:"A private revision differs from the live record.",anchor:"quality-summary"});
  const score=clamp(dimensions.structure*.22+dimensions.sources*.23+dimensions.specificity*.14+dimensions.history*.16+dimensions.connections*.1+dimensions.answerSafety*.15);
  let tier:QualityTier="GENERATED";
  if(score>=40)tier="STRUCTURED";
  if(score>=65&&input.sourceCount>0)tier="SOURCE_GROUNDED";
  if(score>=85&&input.sourceCount>0&&input.verificationState==="VERIFIED"&&input.publicationState==="PUBLISHED")tier="EDITORIALLY_REVIEWED";
  const risk=findings.reduce((total,item)=>total+(item.severity==="HIGH"?30:item.severity==="MEDIUM"?12:4),100-score);
  return {score,tier,dimensions,findings,riskScore:clamp(risk)};
}
