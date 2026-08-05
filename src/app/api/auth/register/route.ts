import { createSessionToken, digestSessionToken, getAuthDatabase, hashPassword, normalizeUsername, sessionCookie, sessionMaxAge, validatePassword, validateUsername } from "@/lib/auth";

const redirect = (request: Request, path: string, cookie?: string) => new Response(null, { status: 303, headers: { Location: new URL(path, request.url).toString(), ...(cookie ? { "Set-Cookie": cookie } : {}), "Cache-Control": "no-store" } });
const sqliteExpiry = () => new Date(Date.now() + sessionMaxAge * 1000).toISOString().replace("T", " ").slice(0, 19);

export async function POST(request: Request) {
  const db = await getAuthDatabase();
  if (!db) return redirect(request, "/register?error=unavailable");
  const data = await request.formData();
  const username = normalizeUsername(String(data.get("username") ?? ""));
  const password = String(data.get("password") ?? "");
  const confirmation = String(data.get("confirmPassword") ?? "");
  if (!validateUsername(username)) return redirect(request, "/register?error=username");
  if (!validatePassword(password)) return redirect(request, "/register?error=password");
  if (password !== confirmation) return redirect(request, "/register?error=confirmation");
  const exists = await db.prepare("SELECT id FROM users WHERE username=? COLLATE NOCASE").bind(username).first<{ id: string }>();
  if (exists) return redirect(request, "/register?error=unavailable-name");
  const userId = crypto.randomUUID();
  const passwordRecord = await hashPassword(password);
  const token = createSessionToken();
  const sessionId = await digestSessionToken(token);
  try {
    await db.batch([
      db.prepare("INSERT INTO users (id,username,password_hash,password_salt,password_iterations) VALUES (?,?,?,?,?)").bind(userId, username, passwordRecord.hash, passwordRecord.salt, passwordRecord.iterations),
      db.prepare("INSERT INTO auth_sessions (id,user_id,expires_at) VALUES (?,?,?)").bind(sessionId, userId, sqliteExpiry()),
    ]);
  } catch { return redirect(request, "/register?error=unavailable-name"); }
  return redirect(request, "/account?welcome=1", sessionCookie(token));
}
