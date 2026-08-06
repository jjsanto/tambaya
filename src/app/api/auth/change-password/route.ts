import { getAuthDatabase, getRequestUser, hashPassword, isSameOrigin, sessionCookie, validatePassword, verifyPassword } from "@/lib/auth";

type PasswordRow = { password_hash: string; password_salt: string; password_iterations: number };
const go = (request: Request, path: string, cookie?: string) => new Response(null, { status: 303, headers: { Location: new URL(path, request.url).toString(), ...(cookie ? { "Set-Cookie": cookie } : {}), "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const [db,user,data] = await Promise.all([getAuthDatabase(),getRequestUser(request),request.formData()]);
  if (!db || !user) return go(request,"/login");
  const currentPassword = String(data.get("currentPassword") ?? "");
  const newPassword = String(data.get("newPassword") ?? "");
  const confirmation = String(data.get("confirmPassword") ?? "");
  if (!validatePassword(newPassword)) return go(request,"/account?securityError=password");
  if (newPassword !== confirmation) return go(request,"/account?securityError=confirmation");
  const record = await db.prepare("SELECT password_hash,password_salt,password_iterations FROM users WHERE id=?").bind(user.id).first<PasswordRow>();
  if (!record || !await verifyPassword(currentPassword,record.password_hash,record.password_salt,record.password_iterations)) return go(request,"/account?securityError=current");
  const next = await hashPassword(newPassword);
  await db.batch([
    db.prepare("UPDATE users SET password_hash=?,password_salt=?,password_iterations=?,failed_login_count=0,locked_until=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(next.hash,next.salt,next.iterations,user.id),
    db.prepare("DELETE FROM auth_sessions WHERE user_id=?").bind(user.id),
  ]);
  return go(request,"/login?changed=1",sessionCookie("",0));
}
