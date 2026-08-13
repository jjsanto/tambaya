import { getQuestionRepository } from "@/data/question-service";
import { API_VERSION, apiError, apiJson } from "@/lib/public-api";
import { withPublicApiAccess } from "@/lib/api-access";
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){
 return withPublicApiAccess(request,"/questions/{slug}",async()=>{
  const {slug}=await params; const question=await (await getQuestionRepository()).findBySlug(slug);
  if(!question)return apiError(request,404,"QUESTION_NOT_FOUND","No published question uses this slug.");
  return apiJson(request,{apiVersion:API_VERSION,data:{id:question.publicId??question.id,slug:question.slug,title:question.questionText,contextSummary:question.contextSummary,category:{name:question.category,slug:question.categorySlug},categories:question.categories??[{name:question.category,slug:question.categorySlug,primary:true}],tags:question.tags,status:{claimed:question.claimedStatus,verified:question.verifiedStatus,verificationState:question.verificationState},statusHistory:question.statusHistory??[],timeline:question.timeline,storySections:question.storySections.map(section=>({id:section.id,kicker:section.kicker,title:section.title,paragraphs:section.paragraphs,blocks:section.blocks})),keyTerms:question.keyTerms,people:question.people,references:question.references,answerAttempts:question.answerAttempts??[],branches:question.branches,links:{relationships:`/api/v1/questions/${slug}/relationships`,web:`/questions/${question.slug}`}}});
 });
}
