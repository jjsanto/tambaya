import { createSessionToken, digestSessionToken, getAuthDatabase, hashPassword, normalizeUsername, passwordIterations, sessionCookie, sessionMaxAge, verifyPassword } from "@/lib/auth";

type UserRow = { id: string; password_hash: string; password_salt: string; password_iterations: number; locked_until: string | null };
const redirect = (request: Request, path: string, cookie?: string) => new Response(null, { status: 303, headers: { Location: new URL(path, request.url).toString(), ...(cookie ? { "Set-Cookie": cookie } : {}), "Cache-Control": "no-store" } });
const sqliteExpiry = () => new Date(Date.now() + sessionMaxAge * 1000).toISOString().replace("T", " ").slice(0, 19);

export async function POST(request: Request) {
  const db = await getAuthDatabase();
  if (!db) return redirect(request, "/login?error=unavailable");
  const data = await request.formData();
  const username = normalizeUsername(String(data.get("username") ?? ""));
  const password = String(data.get("password") ?? "");
  const user = await db.prepare("SELECT id,password_hash,password_salt,password_iterations,locked_until FROM users WHERE username=? COLLATE NOCASE").bind(username).first<UserRow>();
  let passwordValid = false;
  if (user) passwordValid = await verifyPassword(password, user.password_hash, user.password_salt, user.password_iterations);
  else await hashPassword(password, "00112233445566778899aabbccddeeff", passwordIterations);
  const locked = Boolean(user?.locked_until && user.locked_until > new Date().toISOString().replace("T", " ").slice(0, 19));
  if (!user || !passwordValid || locked) {
    if (user) await db.prepare("UPDATE users SET failed_login_count=failed_login_count+1,locked_until=CASE WHEN failed_login_count+1>=5 THEN datetime('now','+15 minutes') ELSE locked_until END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(user.id).run();
    return redirect(request, "/login?error=invalid");
  }
  const token = createSessionToken();
  const sessionId = await digestSessionToken(token);
  await db.batch([
    db.prepare("UPDATE users SET failed_login_count=0,locked_until=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(user.id),
    db.prepare("DELETE FROM auth_sessions WHERE expires_at<=CURRENT_TIMESTAMP"),
    db.prepare("INSERT INTO auth_sessions (id,user_id,expires_at) VALUES (?,?,?)").bind(sessionId, user.id, sqliteExpiry()),
  ]);
  return redirect(request, "/account", sessionCookie(token));
}
