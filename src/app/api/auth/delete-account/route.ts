import { getAuthDatabase, getRequestUser, isSameOrigin, sessionCookie, verifyPassword } from "@/lib/auth";

type PasswordRow = { password_hash: string; password_salt: string; password_iterations: number };
const go = (request: Request, path: string, cookie?: string) => new Response(null, { status: 303, headers: { Location: new URL(path, request.url).toString(), ...(cookie ? { "Set-Cookie": cookie } : {}), "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const [db,user,data] = await Promise.all([getAuthDatabase(),getRequestUser(request),request.formData()]);
  if (!db || !user) return go(request,"/login");
  const username = String(data.get("username") ?? "").trim().toLowerCase();
  const password = String(data.get("password") ?? "");
  if (username !== user.username) return go(request,"/account?securityError=delete-confirmation");
  const record = await db.prepare("SELECT password_hash,password_salt,password_iterations FROM users WHERE id=?").bind(user.id).first<PasswordRow>();
  if (!record || !await verifyPassword(password,record.password_hash,record.password_salt,record.password_iterations)) return go(request,"/account?securityError=delete-password");
  await db.batch([
    db.prepare("DELETE FROM questions WHERE publisher_id=? AND publication_state='DRAFT'").bind(user.id),
    db.prepare("UPDATE questions SET publisher_id=NULL WHERE publisher_id=? AND publication_state='PUBLISHED'").bind(user.id),
    db.prepare("DELETE FROM users WHERE id=?").bind(user.id),
  ]);
  return go(request,"/?accountDeleted=1",sessionCookie("",0));
}
