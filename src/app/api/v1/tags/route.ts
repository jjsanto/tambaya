import { getQuestionRepository } from "@/data/question-service";import{API_VERSION,apiJson}from"@/lib/public-api";
export async function GET(request:Request){const data=await(await getQuestionRepository()).tags();return apiJson(request,{apiVersion:API_VERSION,data:data.map(item=>({...item,links:{questions:`/api/v1/questions?tag=${encodeURIComponent(item.slug)}`}}))});}
