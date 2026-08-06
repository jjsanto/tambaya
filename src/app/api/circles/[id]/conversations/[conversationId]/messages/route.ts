import { getAuthDatabase,getRequestUser,isSameOrigin } from "@/lib/auth";
import { getCircleAccess,redirectTo } from "@/lib/circles";

export async function POST(request:Request,{params}:{params:Promise<{id:string;conversationId:string}>}){
  if(!isSameOrigin(request))return new Response("Forbidden",{status:403});const[db,user,data,{id,conversationId}]=await Promise.all([getAuthDatabase(),getRequestUser(request),request.formData(),params]);if(!db||!user)return redirectTo(request,"/login");if(!await getCircleAccess(db,id,user.id))return new Response("Circle membership required.",{status:403});
  const conversation=await db.prepare("SELECT id FROM circle_conversations WHERE id=? AND circle_id=?").bind(conversationId,id).first<{id:string}>();if(!conversation)return new Response("Conversation not found.",{status:404});const body=String(data.get("body")??"").trim().slice(0,10000);if(body.length<2)return redirectTo(request,`/circles/${id}/conversations/${conversationId}?error=message`);
  const requestedParent=String(data.get("parentId")??"");const parent=requestedParent?await db.prepare("SELECT id FROM circle_messages WHERE id=? AND conversation_id=?").bind(requestedParent,conversationId).first<{id:string}>():null;
  await db.batch([db.prepare("INSERT INTO circle_messages (id,conversation_id,author_id,parent_id,body) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(),conversationId,user.id,parent?.id??null,body),db.prepare("UPDATE circle_conversations SET updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(conversationId)]);return redirectTo(request,`/circles/${id}/conversations/${conversationId}`);
}
