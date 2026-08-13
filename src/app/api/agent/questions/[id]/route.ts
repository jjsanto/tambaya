import { getCloudflareContext } from "@opennextjs/cloudflare";
import { agentHeaders, authorizeAgent } from "@/lib/agent-auth";
import { buildQuestionAgentBrief, parseQuestionSpecification, type ImportableQuestionSpecification } from "@/domain/question-exchange";
import type { CloudflareBindings } from "@/types/cloudflare";

async function runtime() {
  return (await getCloudflareContext({ async: true })) as unknown as { env: CloudflareBindings };
}
export function OPTIONS() { return new Response(null, { status: 204, headers: agentHeaders }); }
async function access(request: Request, env: CloudflareBindings, id: string, scope: "brief:read" | "proposal:write") {
  const auth = await authorizeAgent(request, env.DB, id, scope);
  if (!auth) return Response.json({ error: "Invalid, expired, revoked, or incorrectly scoped agent token." }, { status: 401, headers: agentHeaders });
  if (auth.limited) return Response.json({ error: "Rate limit exceeded. Retry after one minute." }, { status: 429, headers: { ...agentHeaders, "Retry-After": "60" } });
  return auth;
}
async function context(env: CloudflareBindings, id: string) {
  const question = await env.DB.prepare("SELECT id,question_text questionTitle,context_summary contextSummary,category_id categoryId,COALESCE(verified_status,claimed_status) verifiedStatus FROM questions WHERE id=?").bind(id).first<{id:string;questionTitle:string;contextSummary:string;categoryId:string;verifiedStatus:"OPEN"|"PARTIALLY_ANSWERED"|"ANSWERED"}>();
  if (!question) return null;
  const [categories, candidates, sections, paragraphs, timeline, terms, people, attempts, relationships] = await Promise.all([
    env.DB.prepare("SELECT id,name FROM categories ORDER BY name").all<{id:string;name:string}>(),
    env.DB.prepare("SELECT id,slug,question_text questionText,category_name category,category_id categoryId FROM questions WHERE id<>? AND category_id=? AND publication_state='PUBLISHED' ORDER BY question_text").bind(id, question.categoryId).all<{id:string;slug:string;questionText:string;category:string;categoryId:string}>(),
    env.DB.prepare("SELECT id,section_key key,kicker,title FROM question_story_sections WHERE question_id=? ORDER BY position").bind(id).all<{id:string;key:string;kicker:string;title:string}>(),
    env.DB.prepare("SELECT p.section_id sectionId,p.body FROM question_story_paragraphs p JOIN question_story_sections s ON s.id=p.section_id WHERE s.question_id=? ORDER BY s.position,p.position").bind(id).all<{sectionId:string;body:string}>(),
    env.DB.prepare("SELECT display_date displayDate,title,description FROM timeline_events WHERE question_id=? ORDER BY position").bind(id).all<{displayDate:string;title:string;description:string}>(),
    env.DB.prepare("SELECT term,description FROM question_key_terms WHERE question_id=? ORDER BY position").bind(id).all<{term:string;description:string}>(),
    env.DB.prepare("SELECT name,period,association FROM person_associations WHERE question_id=? ORDER BY position").bind(id).all<{name:string;period:string;association:string}>(),
    env.DB.prepare("SELECT title,author,publisher,source_url url,publication_date publicationDate,approach,scope,significance,unresolved FROM question_answer_attempts WHERE question_id=? AND verified=1 ORDER BY position").bind(id).all<ImportableQuestionSpecification["answerAttempts"][number]>(),
    env.DB.prepare("SELECT r.target_question_id targetId,r.target_slug targetSlug,q.question_text targetQuestion,r.relationship_type type,COALESCE(r.confidence,0) confidence,COALESCE(r.rationale,'') rationale FROM question_relationships r JOIN questions q ON q.id=r.target_question_id WHERE r.source_question_id=? AND r.verified=1").bind(id).all<ImportableQuestionSpecification["relationships"][number]>(),
  ]);
  const paragraphRows = paragraphs.results ?? [];
  return { question, categories: categories.results ?? [], candidates: candidates.results ?? [], specification: { contextSummary: question.contextSummary, categoryId: question.categoryId, verifiedStatus: question.verifiedStatus, sections: (sections.results ?? []).map(s => ({ key:s.key,kicker:s.kicker,title:s.title,paragraphs:paragraphRows.filter(p=>p.sectionId===s.id).map(p=>p.body) })), timeline:timeline.results ?? [], keyTerms:terms.results ?? [], people:people.results ?? [], answerAttempts:attempts.results ?? [], relationships:relationships.results ?? [] } };
}
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await runtime(); const { id } = await params;
  const auth = await access(request, env, id, "brief:read"); if (auth instanceof Response) return auth;
  const data = await context(env,id); if(!data) return Response.json({error:"Question not found."},{status:404,headers:agentHeaders});
  return Response.json(buildQuestionAgentBrief({questionId:id,questionTitle:data.question.questionTitle,currentSpecification:data.specification,categories:data.categories,relationshipCandidates:data.candidates}),{headers:agentHeaders});
}
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await runtime(); const { id } = await params;
  const auth = await access(request, env, id, "proposal:write"); if (auth instanceof Response) return auth;
  const raw=await request.text(); const data=await context(env,id); if(!data) return Response.json({error:"Question not found."},{status:404,headers:agentHeaders});
  let specification; try { specification=parseQuestionSpecification(raw,{questionId:id,categoryIds:new Set(data.categories.map(c=>c.id)),relationshipTargets:new Map(data.candidates.map(c=>[c.id,{slug:c.slug,questionText:c.questionText}]))}); } catch(error) { return Response.json({error:error instanceof Error?error.message:"Invalid specification."},{status:400,headers:agentHeaders}); }
  await env.DB.prepare("INSERT INTO external_editorial_proposals (question_id,specification_json,agent_name,model_name,protocol_version) VALUES (?,?,?,?,1) ON CONFLICT(question_id) DO UPDATE SET specification_json=excluded.specification_json,agent_name=excluded.agent_name,model_name=excluded.model_name,updated_at=CURRENT_TIMESTAMP").bind(id,JSON.stringify(specification),auth.row.label,request.headers.get("x-agent-model")?.slice(0,120)??"").run();
  return Response.json({status:"STAGED_FOR_EDITORIAL_REVIEW",questionId:id},{status:202,headers:agentHeaders});
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await runtime(); const { id } = await params;
  const auth=await access(request,env,id,"proposal:write"); if(auth instanceof Response)return auth;
  await env.DB.prepare("DELETE FROM external_editorial_proposals WHERE question_id=? AND agent_name=?").bind(id,auth.row.label).run();
  return Response.json({status:"WITHDRAWN"},{headers:agentHeaders});
}
