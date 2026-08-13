import type { CloudflareBindings } from "@/types/cloudflare";

export const QUESTION_EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5";

type EmbeddingResult = { data?: number[][] };
export type SemanticCandidate = {
  id:string; slug:string; questionText:string; category:string; categoryId:string;
  semanticScore:number; crossCategory:boolean; rankingScore:number;
};

export function questionEmbeddingText(question:{questionText:string;contextSummary:string;category:string}) {
  return `Question: ${question.questionText}\nField: ${question.category}\nContext: ${question.contextSummary}`.slice(0,6000);
}

async function embed(env:CloudflareBindings,texts:string[]) {
  if (!env.AI) return [];
  const result = await env.AI.run(QUESTION_EMBEDDING_MODEL,{text:texts,pooling:"cls"}) as EmbeddingResult;
  return Array.isArray(result?.data) ? result.data : [];
}

export async function semanticCandidates(env:CloudflareBindings,input:{id:string;questionText:string;contextSummary:string;categoryId:string;category:string},limit=30):Promise<SemanticCandidate[]> {
  if (!env.QUESTION_VECTORS || !env.AI) return [];
  const [vector] = await embed(env,[questionEmbeddingText(input)]);
  if (!vector) return [];
  const result = await env.QUESTION_VECTORS.query(vector,{topK:Math.min(50,Math.max(limit*2,30)),returnMetadata:"all"});
  const matches = (result.matches ?? []).filter(match=>match.id!==input.id);
  if (!matches.length) return [];
  const placeholders=matches.map(()=>"?").join(",");
  const rows=await env.DB.prepare(`SELECT id,slug,question_text questionText,category_name category,category_id categoryId FROM questions WHERE publication_state='PUBLISHED' AND id IN (${placeholders})`).bind(...matches.map(item=>item.id)).all<{id:string;slug:string;questionText:string;category:string;categoryId:string}>();
  const byId=new Map((rows.results??[]).map(row=>[row.id,row]));
  const ranked=matches.flatMap(match=>{
    const row=byId.get(match.id); if(!row) return [];
    const crossCategory=row.categoryId!==input.categoryId;
    const semanticScore=Math.max(0,Math.min(1,match.score));
    // A small same-discipline penalty makes cross-disciplinary bridges visible
    // without hiding genuinely close neighbours.
    const rankingScore=Math.max(0,Math.min(1,semanticScore+(crossCategory?0.06:-0.04)));
    return [{...row,semanticScore,crossCategory,rankingScore}];
  }).sort((a,b)=>b.rankingScore-a.rankingScore);
  const diverse:SemanticCandidate[]=[];
  const perCategory=new Map<string,number>();
  for(const candidate of ranked){
    if((perCategory.get(candidate.categoryId)??0)>=4) continue;
    diverse.push(candidate);
    perCategory.set(candidate.categoryId,(perCategory.get(candidate.categoryId)??0)+1);
    if(diverse.length>=limit) break;
  }
  return diverse;
}

export async function indexQuestionBatch(env:CloudflareBindings,after="",limit=50) {
  if(!env.AI||!env.QUESTION_VECTORS) throw new Error("Semantic bindings are not configured.");
  const result=await env.DB.prepare("SELECT id,slug,question_text questionText,context_summary contextSummary,category_name category,category_id categoryId,updated_at updatedAt FROM questions WHERE publication_state='PUBLISHED' AND id>? ORDER BY id LIMIT ?").bind(after,Math.min(100,Math.max(1,limit))).all<{id:string;slug:string;questionText:string;contextSummary:string;category:string;categoryId:string;updatedAt:string}>();
  const rows=result.results??[];
  const vectors=await embed(env,rows.map(questionEmbeddingText));
  if(vectors.length!==rows.length) throw new Error("Embedding response did not match the requested batch.");
  await env.QUESTION_VECTORS.upsert(rows.map((row,index)=>({id:row.id,values:vectors[index],metadata:{slug:row.slug,categoryId:row.categoryId,updatedAt:row.updatedAt}})));
  return {indexed:rows.length,nextCursor:rows.at(-1)?.id??after,done:rows.length<limit};
}
