import type { Metadata } from "next";
import { EditorialWorkspace } from "@/components/editorial-workspace";
export const metadata: Metadata = { title: "Editorial workspace" };
export default async function EditorialPage({
  searchParams,
}: {
  searchParams: Promise<{ login?: string;premium?:string }>;
}) {
  const query=await searchParams;const login = query.login;
  return (
    <div className="page shell">
      <header className="page-intro">
        <span className="eyebrow">Tambaya editorial</span>
        <h1>Question publishing workspace</h1>
        <p>
          Create private drafts, inspect the review queue, verify status
          metadata, and publish approved questions directly to D1.
        </p>
      </header>
      <div className="notice">
        <strong>Public-content rule:</strong> provide context, history, and
        significance—but never resolve the question. New records remain private
        until an editor explicitly publishes them.
      </div>
      {login !== "success" && (
        <form
          className="editorial-server-login"
          action="/api/editorial/session"
          method="post"
        >
          <label>
            Editorial token
            <input
              type="password"
              name="token"
              required
              autoComplete="current-password"
            />
          </label>
          <button className="button small">Sign in securely</button>
          {login === "failed" && (
            <p role="alert">
              That token was not accepted. Copy it without spaces and try again.
            </p>
          )}
        </form>
      )}
      {login==="success"&&<section className="premium-admin"><div><span className="eyebrow">Premium testing</span><h2>Set a user plan</h2><p>Promote a test account to unlock title-only AI Story generation, or return it to the free plan.</p>{query.premium&&<strong role="status">{query.premium==="missing"?"Username not found.":`Plan changed to ${query.premium}.`}</strong>}</div><form action="/api/editorial/users/premium" method="post"><label>Username<input name="username" required/></label><label>Plan<select name="plan"><option value="PREMIUM">Premium</option><option value="FREE">Free</option></select></label><button className="button small">Update plan</button></form></section>}
      <EditorialWorkspace connected={login === "success"} />
    </div>
  );
}
