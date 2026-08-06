import type { D1DatabaseLike } from "@/types/cloudflare";

export type CircleAccess = { id: string; name: string; description: string; owner_id: string; role: "OWNER" | "MEMBER" };

export async function getCircleAccess(db: D1DatabaseLike, circleId: string, userId: string) {
  return db.prepare("SELECT c.id,c.name,c.description,c.owner_id,m.role FROM circles c JOIN circle_members m ON m.circle_id=c.id WHERE c.id=? AND m.user_id=?").bind(circleId,userId).first<CircleAccess>();
}

export function safeReturn(value: FormDataEntryValue | null, fallback = "/circles") {
  const path = String(value ?? fallback);
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}

export function redirectTo(request: Request, path: string) {
  return new Response(null,{status:303,headers:{Location:new URL(path,request.url).toString(),"Cache-Control":"private, no-store"}});
}
