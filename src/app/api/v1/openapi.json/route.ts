import { apiJson } from "@/lib/public-api";
export async function GET(request:Request){
 const origin=new URL(request.url).origin;
 return apiJson(request,{
  openapi:"3.1.0",info:{title:"Tambaya Public API",version:"1.0.0",description:"Read-only access to published questions and the graph of human inquiry. Tambaya provides contextual material around questions, never answers."},servers:[{url:`${origin}/api/v1`}],
  paths:{
   "/questions":{get:{summary:"List published questions",parameters:[{name:"page",in:"query",schema:{type:"integer",minimum:1}},{name:"pageSize",in:"query",schema:{type:"integer",minimum:1,maximum:50}},{name:"status",in:"query",schema:{$ref:"#/components/schemas/AnswerStatus"}},{name:"category",in:"query",schema:{type:"string"}},{name:"tag",in:"query",schema:{type:"string"}},{name:"sort",in:"query",schema:{type:"string",enum:["newest","recently-verified","most-connected"]}}],responses:{"200":{description:"Paginated question summaries"},"400":{$ref:"#/components/responses/Error"}}}},
   "/questions/{slug}":{get:{summary:"Get a complete published question",parameters:[{$ref:"#/components/parameters/Slug"}],responses:{"200":{description:"Complete question record"},"404":{$ref:"#/components/responses/Error"}}}},
   "/questions/{slug}/relationships":{get:{summary:"List approved relationships",parameters:[{$ref:"#/components/parameters/Slug"}],responses:{"200":{description:"Incoming and outgoing question relationships"},"404":{$ref:"#/components/responses/Error"}}}},
   "/categories":{get:{summary:"List categories",responses:{"200":{description:"Categories with published-question counts"}}}},
   "/tags":{get:{summary:"List tags",responses:{"200":{description:"Tags with published-question counts"}}}},
  },
  components:{parameters:{Slug:{name:"slug",in:"path",required:true,schema:{type:"string"}}},schemas:{AnswerStatus:{type:"string",enum:["OPEN","PARTIALLY_ANSWERED","ANSWERED"]},Error:{type:"object",properties:{apiVersion:{type:"string"},error:{type:"object",properties:{code:{type:"string"},message:{type:"string"},status:{type:"integer"}},required:["code","message","status"]}},required:["apiVersion","error"]}},responses:{Error:{description:"Standard API error",content:{"application/json":{schema:{$ref:"#/components/schemas/Error"}}}}}},
 });
}
