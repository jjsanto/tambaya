import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthDatabase, getCurrentUser } from "@/lib/auth";
import { getPublicApiKeys, getPublicApiUsage } from "@/lib/api-keys";

export const metadata:Metadata={title:"Developer API"};
type Params={created?:string;revoked?:string;error?:string};

export default async function DeveloperPage({searchParams}:{searchParams:Promise<Params>}) {
  const [user,params]=await Promise.all([getCurrentUser(),searchParams]); if(!user)redirect("/login");
  const db=await getAuthDatabase(); if(!db)redirect("/account");
  const [keys,usage]=await Promise.all([getPublicApiKeys(db,user.id),getPublicApiUsage(db,user.id)]);
  return <div className="page shell developer-space"><nav className="breadcrumbs"><Link href="/account">My Space</Link><span>/</span><span>Developer API</span></nav><header className="page-intro"><span className="eyebrow">Developer API</span><h1>Connect your tools to Tambaya.</h1><p>Create and revoke API keys, monitor requests, and copy authenticated examples. Keys receive 5,000 requests per day; anonymous clients receive 100.</p></header>
  {params.created&&<section className="api-key-reveal" role="status"><strong>Copy this key now. It will not be shown again.</strong><code>{params.created}</code></section>}
  {params.revoked&&<p className="auth-success">API key revoked.</p>}{params.error&&<p className="auth-error">Use a key name between 1 and 60 characters.</p>}
  <section className="developer-grid"><div><h2>API keys</h2><form action="/api/account/api-keys" method="post" className="collection-form"><label>Key name<input name="name" maxLength={60} required placeholder="Research agent"/></label><button className="button small">Create API key</button></form><div className="api-key-list">{keys.map(key=><article key={key.id}><div><strong>{key.name}</strong><code>{key.key_prefix}…</code><small>Created {key.created_at} · {key.last_used_at?`Last used ${key.last_used_at}`:"Never used"}</small></div>{key.revoked_at?<span>Revoked</span>:<form action="/api/account/api-keys" method="post"><input type="hidden" name="action" value="revoke"/><input type="hidden" name="id" value={key.id}/><button className="text-button">Revoke</button></form>}</article>)}{!keys.length&&<p className="empty compact-empty">No API keys yet.</p>}</div></div>
  <aside><h2>Authenticated request</h2><pre><code>{`curl -H "Authorization: Bearer YOUR_KEY" \\\n  "https://tambaya.jjsanto.workers.dev/api/v1/questions?pageSize=6"`}</code></pre><p><Link className="text-link" href="/developers/api">Read the API documentation →</Link></p></aside></section>
  <section className="api-usage"><h2>Recent usage</h2>{usage.length?<table><thead><tr><th>Date</th><th>Endpoint</th><th>Requests</th><th>Errors</th></tr></thead><tbody>{usage.map(row=><tr key={`${row.usage_date}-${row.endpoint}`}><td>{row.usage_date}</td><td><code>{row.endpoint}</code></td><td>{row.request_count}</td><td>{row.error_count}</td></tr>)}</tbody></table>:<p className="empty compact-empty">Usage will appear after the first authenticated request.</p>}</section></div>;
}
