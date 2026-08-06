import { getAuthDatabase,getRequestUser,isSameOrigin,normalizeUsername } from "@/lib/auth";
import { getCircleAccess,redirectTo } from "@/lib/circles";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!isSameOrigin(request))return new Response("Forbidden",{status:403});
  const[db,user,data,{id}]=await Promise.all([getAuthDatabase(),getRequestUser(request),request.formData(),params]);
  if(!db||!user)return redirectTo(request,"/login");const access=await getCircleAccess(db,id,user.id);if(access?.role!=="OWNER")return new Response("Only the circle owner can invite members.",{status:403});
  const username=normalizeUsername(String(data.get("username")??""));const invitee=await db.prepare("SELECT id FROM users WHERE username=? COLLATE NOCASE").bind(username).first<{id:string}>();
  if(!invitee||invitee.id===user.id)return redirectTo(request,`/circles/${id}?invite=invalid`);
  const member=await db.prepare("SELECT 1 present FROM circle_members WHERE circle_id=? AND user_id=?").bind(id,invitee.id).first<{present:number}>();if(member)return redirectTo(request,`/circles/${id}?invite=member`);
  try{await db.prepare("INSERT INTO circle_invitations (id,circle_id,invitee_id,invited_by) VALUES (?,?,?,?)").bind(crypto.randomUUID(),id,invitee.id,user.id).run();}catch{return redirectTo(request,`/circles/${id}?invite=pending`);}
  return redirectTo(request,`/circles/${id}?invite=sent`);
}
