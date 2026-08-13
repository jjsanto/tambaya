import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = { title: "Public API" };

const endpoints = [
  ["List questions", "GET /api/v1/questions"],
  ["Question detail", "GET /api/v1/questions/{slug}"],
  ["Question relationships", "GET /api/v1/questions/{slug}/relationships"],
  ["List categories", "GET /api/v1/categories"],
  ["List tags", "GET /api/v1/tags"],
];

export default function PublicApiPage() {
  return (
    <div className="page shell api-docs">
      <header className="api-docs-hero">
       <div className="page-intro">
        <span className="eyebrow">For developers and AI agents</span>
        <h1>Tambaya Public API</h1>
        <p>
          Read published questions, their encyclopedic context, and the real
          relationships between them. Version 1 is anonymous and read-only.
        </p>
        <div className="actions">
          <Link className="button" href="/account/developer">
            Manage API keys
          </Link>
          <Link className="button" href="/api/v1/openapi.json">
            OpenAPI specification
          </Link>
          <Link className="button ghost" href="/api/v1">
            API discovery document
          </Link>
        </div>
       </div>
       <Image className="api-docs-meerkat" src="/images/tambaya-meerkat-api.png" width={1536} height={1024} priority sizes="(max-width: 900px) 92vw, 48vw" alt="A curious meerkat traces Tambaya questions through a network of structured data"/>
      </header>

      <section>
        <h2>Endpoints</h2>
        <div className="api-endpoints">
          {endpoints.map(([title, path]) => (
            <article key={path}>
              <strong>{title}</strong>
              <code>{path}</code>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>Authentication and quotas</h2>
        <p>
          Anonymous clients can make 100 requests per day. A personal API key
          raises that allowance to 5,000 requests per day and unlocks usage
          reporting in My Space. Send it as a bearer token and never place it in
          a URL.
        </p>
        <pre><code>{`curl -H "Authorization: Bearer YOUR_KEY" \\\n+  "https://tambaya.jjsanto.workers.dev/api/v1/questions?pageSize=6"`}</code></pre>
        <p><Link className="text-link" href="/account/developer">Create or revoke API keys →</Link></p>
      </section>

      <section>
        <h2>Filter and paginate</h2>
        <p>
          Combine <code>category</code>, <code>status</code>, and <code>tag</code>.
          Results use <code>page</code> and <code>pageSize</code>; page size is capped
          at 50. Sort with <code>newest</code>, <code>recently-verified</code>, or
          <code>most-connected</code>.
        </p>
        <pre><code>{`curl "https://tambaya.jjsanto.workers.dev/api/v1/questions?category=philosophy&status=OPEN&pageSize=6"`}</code></pre>
      </section>

      <section>
        <h2>Follow the question map</h2>
        <p>
          Relationship records identify the connection type and direction, and
          link directly to the connected question’s API record.
        </p>
        <pre><code>{`curl "https://tambaya.jjsanto.workers.dev/api/v1/questions/what-is-consciousness/relationships"`}</code></pre>
      </section>

      <aside className="notice">
        Responses are JSON, include CORS and cache headers, and support conditional
        requests through <code>ETag</code> and <code>If-None-Match</code>.
      </aside>
    </div>
  );
}
