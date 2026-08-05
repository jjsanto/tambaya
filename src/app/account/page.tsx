import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { welcome } = await searchParams;
  return <div className="page shell account-page"><header className="page-intro"><span className="eyebrow">Your Tambaya</span><h1>Hello, {user.username}.</h1><p>{welcome ? "Your account is ready." : "This is your personal place in the question map."}</p></header><section className="account-panel"><div><h2>Personal collections are next</h2><p>Your secure account is active. The next release will let you bookmark questions and organise them into named collections.</p><Link className="button small" href="/explore">Explore questions</Link></div><form action="/api/auth/logout" method="post"><button className="button ghost small">Log out</button></form></section></div>;
}
