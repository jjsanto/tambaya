import type { D1DatabaseLike } from "@/types/cloudflare";

export type PublicApiKey = { id:string; name:string; key_prefix:string; created_at:string; last_used_at:string|null; revoked_at:string|null };
export type PublicApiUsage = { usage_date:string; endpoint:string; request_count:number; error_count:number };

export async function getPublicApiKeys(db:D1DatabaseLike,userId:string) {
  return (await db.prepare("SELECT id,name,key_prefix,created_at,last_used_at,revoked_at FROM public_api_keys WHERE user_id=? ORDER BY created_at DESC").bind(userId).all<PublicApiKey>()).results ?? [];
}

export async function getPublicApiUsage(db:D1DatabaseLike,userId:string) {
  return (await db.prepare("SELECT u.usage_date,u.endpoint,SUM(u.request_count) request_count,SUM(u.error_count) error_count FROM public_api_usage u JOIN public_api_keys k ON k.id=u.api_key_id WHERE k.user_id=? GROUP BY u.usage_date,u.endpoint ORDER BY u.usage_date DESC,u.request_count DESC LIMIT 60").bind(userId).all<PublicApiUsage>()).results ?? [];
}
