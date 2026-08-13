import { getQuestionRepository } from "@/data/question-service";import{API_VERSION,apiJson}from"@/lib/public-api";
import{withPublicApiAccess}from"@/lib/api-access";
export async function GET(request:Request){return withPublicApiAccess(request,"/categories",async()=>{const data=await(await getQuestionRepository()).categories();return apiJson(request,{apiVersion:API_VERSION,data:data.map(item=>({...item,links:{questions:`/api/v1/questions?category=${encodeURIComponent(item.slug)}`}}))});});}
