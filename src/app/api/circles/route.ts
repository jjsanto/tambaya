import { getAuthDatabase,getRequestUser,isSameOrigin } from "@/lib/auth";
import { redirectTo,safeReturn } from "@/lib/circles";

export async function POST(request:Request){
  if(!isSameOrigin(request))return new Response("Forbidden",{status:403});
  const[db,user,data]=await Promise.all([getAuthDatabase(),getRequestUser(request),request.formData()]);
  if(!db||!user)return redirectTo(request,"/login");
  const name=String(data.get("name")??"").trim().slice(0,80);const description=String(data.get("description")??"").trim().slice(0,500);
  if(name.length<3)return redirectTo(request,"/circles?error=name");
  const id=crypto.randomUUID();
  await db.batch([db.prepare("INSERT INTO circles (id,owner_id,name,description) VALUES (?,?,?,?)").bind(id,user.id,name,description),db.prepare("INSERT INTO circle_members (circle_id,user_id,role) VALUES (?,?,'OWNER')").bind(id,user.id)]);
  return redirectTo(request,safeReturn(data.get("returnTo"),`/circles/${id}`).replace("{id}",id));
}
