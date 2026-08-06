import { createSessionToken, digestSessionToken, getAuthDatabase, getRequestUser, hashPassword, isSameOrigin, sessionCookie, validatePassword, verifyPassword } from "@/lib/auth";

type PasswordRow = { password_hash: string; password_salt: string; password_iterations: number };
type ChallengeRow = { user_id: string };
const challengeCookieName = "tambaya_password_change";
const challengeMaxAge = 5 * 60;
const challengeCookie = (token: string, maxAge = challengeMaxAge) => `${challengeCookieName}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
const cookieValue = (request: Request, name: string) => request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1);
const go = (request: Request, path: string, responseCookies: string[] = []) => { const headers = new Headers({ Location: new URL(path, request.url).toString(), "Cache-Control": "no-store" }); responseCookies.forEach(cookie => headers.append("Set-Cookie",cookie)); return new Response(null,{ status: 303,headers }); };

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const [db,user,data] = await Promise.all([getAuthDatabase(),getRequestUser(request),request.formData()]);
  if (!db || !user) return go(request,"/login");
  if (data.get("action") === "verify") {
    const currentPassword = String(data.get("currentPassword") ?? "");
    const record = await db.prepare("SELECT password_hash,password_salt,password_iterations FROM users WHERE id=?").bind(user.id).first<PasswordRow>();
    if (!record || !await verifyPassword(currentPassword,record.password_hash,record.password_salt,record.password_iterations)) return go(request,"/account?securityError=current");
    const token = createSessionToken();
    const digest = await digestSessionToken(token);
    await db.batch([
      db.prepare("DELETE FROM password_change_challenges WHERE user_id=? OR expires_at<=CURRENT_TIMESTAMP").bind(user.id),
      db.prepare("INSERT INTO password_change_challenges (id,user_id,expires_at) VALUES (?,?,datetime('now','+5 minutes'))").bind(digest,user.id),
    ]);
    return go(request,"/account?passwordStep=new",[challengeCookie(token)]);
  }
  const newPassword = String(data.get("newPassword") ?? "");
  const confirmation = String(data.get("confirmPassword") ?? "");
  if (!validatePassword(newPassword)) return go(request,"/account?passwordStep=new&securityError=password");
  if (newPassword !== confirmation) return go(request,"/account?passwordStep=new&securityError=confirmation");
  const token = cookieValue(request,challengeCookieName);
  const challenge = token ? await db.prepare("SELECT user_id FROM password_change_challenges WHERE id=? AND expires_at>CURRENT_TIMESTAMP").bind(await digestSessionToken(token)).first<ChallengeRow>() : null;
  if (!challenge || challenge.user_id !== user.id) return go(request,"/account?securityError=challenge",[challengeCookie("",0)]);
  const next = await hashPassword(newPassword);
  await db.batch([
    db.prepare("UPDATE users SET password_hash=?,password_salt=?,password_iterations=?,failed_login_count=0,locked_until=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(next.hash,next.salt,next.iterations,user.id),
    db.prepare("DELETE FROM auth_sessions WHERE user_id=?").bind(user.id),
    db.prepare("DELETE FROM password_change_challenges WHERE user_id=?").bind(user.id),
  ]);
  return go(request,"/login?changed=1",[sessionCookie("",0),challengeCookie("",0)]);
}
