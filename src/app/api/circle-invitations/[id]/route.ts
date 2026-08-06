import { getAuthDatabase,getRequestUser,isSameOrigin } from "@/lib/auth";
import { redirectTo } from "@/lib/circles";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!isSameOrigin(request))return new Response("Forbidden",{status:403});const[db,user,data,{id}]=await Promise.all([getAuthDatabase(),getRequestUser(request),request.formData(),params]);if(!db||!user)return redirectTo(request,"/login");
  const invitation=await db.prepare("SELECT circle_id FROM circle_invitations WHERE id=? AND invitee_id=? AND status='PENDING'").bind(id,user.id).first<{circle_id:string}>();if(!invitation)return redirectTo(request,"/circles?invite=missing");
  const accept=data.get("action")==="accept";const statements=[db.prepare("UPDATE circle_invitations SET status=?,responded_at=CURRENT_TIMESTAMP WHERE id=? AND status='PENDING'").bind(accept?"ACCEPTED":"DECLINED",id)];if(accept)statements.push(db.prepare("INSERT OR IGNORE INTO circle_members (circle_id,user_id,role) VALUES (?,?,'MEMBER')").bind(invitation.circle_id,user.id));await db.batch(statements);
  return redirectTo(request,accept?`/circles/${invitation.circle_id}`:"/circles");
}
