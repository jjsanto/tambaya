import { getAuthDatabase, getRequestUser, isSameOrigin } from "@/lib/auth";
import { digestApiKey, generateApiKey } from "@/lib/api-access";

function redirectTo(request:Request, suffix="") { return new Response(null,{status:303,headers:{Location:new URL(`/account/developer${suffix}`,request.url).toString(),"Cache-Control":"no-store"}}); }

export async function POST(request:Request) {
  if (!isSameOrigin(request)) return new Response("Forbidden",{status:403});
  const [db,user,data]=await Promise.all([getAuthDatabase(),getRequestUser(request),request.formData()]);
  if(!db||!user)return new Response(null,{status:303,headers:{Location:new URL("/login",request.url).toString()}});
  const action=String(data.get("action")??"create");
  if(action==="revoke") {
    await db.prepare("UPDATE public_api_keys SET revoked_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=? AND revoked_at IS NULL").bind(String(data.get("id")??""),user.id).run();
    return redirectTo(request,"?revoked=1");
  }
  const name=String(data.get("name")??"").trim();
  if(name.length<1||name.length>60)return redirectTo(request,"?error=name");
  const key=generateApiKey();
  await db.prepare("INSERT INTO public_api_keys(id,user_id,name,key_prefix,key_hash) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),user.id,name,key.slice(0,16),await digestApiKey(key)).run();
  const location=new URL("/account/developer",request.url); location.searchParams.set("created",key);
  return new Response(null,{status:303,headers:{Location:location.toString(),"Cache-Control":"no-store"}});
}
