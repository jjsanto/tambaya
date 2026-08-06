import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in" };
const errors: Record<string,string> = { invalid: "The username or password was not accepted. After repeated failures, sign-in pauses for 15 minutes.", unavailable: "Authentication is temporarily unavailable." };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; changed?: string }> }) {
  if (await getCurrentUser()) redirect("/account");
  const { error,changed } = await searchParams;
  return <div className="page shell auth-page"><section><span className="eyebrow">Welcome back</span><h1>Log in to Tambaya</h1><p>Return to the questions and collections that matter to you.</p>{changed && <p className="auth-success">Your password was changed. Log in again on this device.</p>}<form action="/api/auth/login" method="post" className="auth-form"><label>Username<input name="username" required minLength={3} maxLength={30} autoComplete="username" autoCapitalize="none"/></label><label>Password<input name="password" type="password" required minLength={10} maxLength={128} autoComplete="current-password"/></label>{error && <p className="auth-error" role="alert">{errors[error] ?? errors.invalid}</p>}<button className="button">Log in</button></form><p className="auth-switch">New to Tambaya? <Link href="/register">Create an account</Link>.</p></section></div>;
}
