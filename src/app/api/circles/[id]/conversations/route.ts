import { getAuthDatabase,getRequestUser,isSameOrigin } from "@/lib/auth";
import { getCircleAccess,redirectTo } from "@/lib/circles";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!isSameOrigin(request))return new Response("Forbidden",{status:403});const[db,user,data,{id}]=await Promise.all([getAuthDatabase(),getRequestUser(request),request.formData(),params]);if(!db||!user)return redirectTo(request,"/login");if(!await getCircleAccess(db,id,user.id))return new Response("Circle membership required.",{status:403});
  const questionId=String(data.get("questionId")??"");const question=await db.prepare("SELECT id,question_text FROM questions WHERE id=? AND publication_state='PUBLISHED'").bind(questionId).first<{id:string;question_text:string}>();if(!question)return redirectTo(request,`/circles/${id}?conversation=question`);
  const title=String(data.get("title")??"").trim().slice(0,160)||question.question_text;const conversationId=crypto.randomUUID();
  try{await db.prepare("INSERT INTO circle_conversations (id,circle_id,question_id,created_by,title) VALUES (?,?,?,?,?)").bind(conversationId,id,question.id,user.id,title).run();}catch{const existing=await db.prepare("SELECT id FROM circle_conversations WHERE circle_id=? AND question_id=?").bind(id,question.id).first<{id:string}>();return redirectTo(request,existing?`/circles/${id}/conversations/${existing.id}`:`/circles/${id}?conversation=error`);}
  return redirectTo(request,`/circles/${id}/conversations/${conversationId}`);
}
