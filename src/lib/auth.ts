import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cookies } from "next/headers";
import type { CloudflareBindings, D1DatabaseLike } from "@/types/cloudflare";

export const authCookieName = "tambaya_session";
export const passwordIterations = 50_000;
export const sessionMaxAge = 60 * 60 * 24 * 30;
export type AuthUser = { id: string; username: string };

const encoder = new TextEncoder();
const hex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
const fromHex = (value: string) => new Uint8Array(value.match(/.{1,2}/g)?.map(byte => Number.parseInt(byte, 16)) ?? []);
const randomHex = (size: number) => { const bytes = new Uint8Array(size); crypto.getRandomValues(bytes); return hex(bytes); };

export function normalizeUsername(value: string) { return value.trim().toLowerCase(); }
export function validateUsername(value: string) { return /^[a-z0-9][a-z0-9_-]{2,29}$/.test(normalizeUsername(value)); }
export function validatePassword(value: string) { return value.length >= 10 && value.length <= 128; }

export async function hashPassword(password: string, salt = randomHex(16), iterations = passwordIterations) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromHex(salt), iterations }, key, 256);
  return { hash: hex(new Uint8Array(bits)), salt, iterations };
}

export async function verifyPassword(password: string, expectedHash: string, salt: string, iterations: number) {
  const actual = fromHex((await hashPassword(password, salt, iterations)).hash);
  const expected = fromHex(expectedHash);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index++) difference |= actual[index] ^ expected[index];
  return difference === 0;
}

export async function digestSessionToken(token: string) { return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(token)))); }
export function createSessionToken() { return randomHex(32); }
export function sessionCookie(token: string, maxAge = sessionMaxAge) { return `${authCookieName}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`; }

export async function getAuthDatabase(): Promise<D1DatabaseLike | null> {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  try { const { env } = await getCloudflareContext({ async: true }) as unknown as { env: CloudflareBindings }; return env.DB ?? null; } catch { return null; }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(authCookieName)?.value;
  const db = await getAuthDatabase();
  if (!token || !db) return null;
  const digest = await digestSessionToken(token);
  return db.prepare("SELECT u.id,u.username FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>CURRENT_TIMESTAMP").bind(digest).first<AuthUser>();
}

export async function getRequestUser(request: Request): Promise<AuthUser | null> {
  const cookie = request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(`${authCookieName}=`));
  const token = cookie?.slice(authCookieName.length + 1);
  const db = await getAuthDatabase();
  if (!token || !db) return null;
  return db.prepare("SELECT u.id,u.username FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>CURRENT_TIMESTAMP").bind(await digestSessionToken(token)).first<AuthUser>();
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
