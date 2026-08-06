import { getAuthDatabase,getRequestUser,isSameOrigin } from "@/lib/auth";
import { parseSubmission,replaceSubmissionContent,validateForSubmission } from "@/lib/submissions";
import { slugifyQuestion } from "@/domain/question";
import {eventStatement,submissionSnapshot}from"@/lib/submission-events";

export async function POST(request:Request){
  if(!isSameOrigin(request))return Response.json({error:"Forbidden"},{status:403});
  const [db,user,raw]=await Promise.all([getAuthDatabase(),getRequestUser(request),request.json()]); if(!db||!user)return Response.json({error:"Log in to publish a question."},{status:401});
  const input=parseSubmission(raw); if(!input)return Response.json({error:"Write a complete question ending in a question mark and choose a category."},{status:400});
  const action=(raw as {action?:string}).action; if(action==="submit"){const error=validateForSubmission(input);if(error)return Response.json({error},{status:400});}
  const id=crypto.randomUUID(); const slug=`${slugifyQuestion(input.questionText).slice(0,90)}-${id.slice(0,8)}`;
  await db.prepare("INSERT INTO questions (id,publisher_id,question_text,slug,publication_state,visibility,claimed_status,verification_state,category_id,category_name,context_summary,public_json,submission_state) VALUES (?,?,?,?,'DRAFT','PRIVATE',?,'PENDING',?,'',?,'{}',?)").bind(id,user.id,input.questionText,slug,input.claimedStatus,input.categoryId,input.contextSummary,action==="submit"?"SUBMITTED":"DRAFT").run();
  try{await replaceSubmissionContent(db,id,user.id,input,action==="submit"?"SUBMITTED":"DRAFT");await eventStatement(db,id,"PUBLISHER",action==="submit"?"SUBMITTED":"DRAFT_CREATED",null,submissionSnapshot(input)).run();}catch{await db.prepare("DELETE FROM questions WHERE id=? AND publisher_id=?").bind(id,user.id).run();return Response.json({error:"Choose a valid category."},{status:400});}
  return Response.json({id,state:action==="submit"?"SUBMITTED":"DRAFT"},{status:201});
}
