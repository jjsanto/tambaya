import { authCookieName, digestSessionToken, getAuthDatabase, sessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const cookie = request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(`${authCookieName}=`));
  const token = cookie?.slice(authCookieName.length + 1);
  const db = await getAuthDatabase();
  if (token && db) await db.prepare("DELETE FROM auth_sessions WHERE id=?").bind(await digestSessionToken(token)).run();
  return new Response(null, { status: 303, headers: { Location: new URL("/", request.url).toString(), "Set-Cookie": sessionCookie("", 0), "Cache-Control": "no-store" } });
}
