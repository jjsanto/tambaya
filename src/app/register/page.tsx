import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Create account" };
const errors: Record<string,string> = { username: "Use 3–30 lowercase letters, numbers, underscores, or hyphens.", password: "Use a password between 10 and 128 characters.", confirmation: "The password confirmation does not match.", "unavailable-name": "That username is unavailable.", unavailable: "Registration is temporarily unavailable." };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentUser()) redirect("/account");
  const { error } = await searchParams;
  return <div className="page shell auth-page"><section><span className="eyebrow">Join Tambaya</span><h1>Create your account</h1><p>Start with a username. Bookmarks and personal collections will build on this account.</p><form action="/api/auth/register" method="post" className="auth-form"><label>Username<input name="username" required minLength={3} maxLength={30} pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,29}" autoComplete="username" autoCapitalize="none"/><small>Letters, numbers, underscores, and hyphens.</small></label><label>Password<input name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password"/></label><label>Confirm password<input name="confirmPassword" type="password" required minLength={10} maxLength={128} autoComplete="new-password"/></label>{error && <p className="auth-error" role="alert">{errors[error] ?? "The account could not be created."}</p>}<button className="button">Create account</button></form><p className="auth-switch">Already registered? <Link href="/login">Log in</Link>.</p></section></div>;
}
