import { getQuestionRepository } from "@/data/question-service";import{API_VERSION,apiJson}from"@/lib/public-api";
import{withPublicApiAccess}from"@/lib/api-access";
export async function GET(request:Request){return withPublicApiAccess(request,"/tags",async()=>{const data=await(await getQuestionRepository()).tags();return apiJson(request,{apiVersion:API_VERSION,data:data.map(item=>({...item,links:{questions:`/api/v1/questions?tag=${encodeURIComponent(item.slug)}`}}))});});}
