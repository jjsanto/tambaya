# Tambaya

Tambaya is a curated graph of **questions worth asking**. Public Tambaya presents a question’s story, history, status metadata, references, and relationships—never an answer.

This repository implements Phase 1, **Tambaya Preview**: landing, exploration, categories, lexical search, rich Question Story pages, related-question navigation, a minimal editorial draft endpoint, normalized D1 content, R2-ready image keys, responsive layouts, and invariant tests.

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The local Next.js experience uses the same 100-question editorial source that generates the normalized D1 seed, so no Cloudflare account is required to evaluate the complete public UI. The catalogue spans 13 categories and includes rich, reviewed Story sections, timelines, relationships, and authoritative references.

Run verification:

```bash
npm test
npm run lint
npm run build
```

## Local Cloudflare preview

Create and migrate a local D1 database, seed its binding smoke fixture, then run the OpenNext preview:

```bash
npm run db:migrate:local
npm run db:seed:local
npm run preview
```

## One-time Cloudflare setup

1. Authenticate: `npx wrangler login`.
2. Create D1: `npx wrangler d1 create tambaya`.
3. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.jsonc` with the returned ID.
4. Optional image storage: enable R2 in the Cloudflare dashboard, then run `npx wrangler r2 bucket create tambaya-question-images` and add its `QUESTION_IMAGES` binding. Phase 1 currently serves its static image assets with the Worker and does not require R2.
5. Add `EDITORIAL_TOKEN` as a Worker secret: `npx wrangler secret put EDITORIAL_TOKEN`.
6. Generate, apply, and seed production D1: `npm run seed:generate`, `npm run db:migrate:remote`, then `npx wrangler d1 execute tambaya --remote --file=./scripts/generated-seed.sql`.
7. Build and deploy: `npm run deploy`.

The configuration follows Cloudflare’s current Workers + OpenNext convention: `.open-next/worker.js`, `.open-next/assets`, `nodejs_compat`, and an explicit compatibility date. Connect `jjsanto/tambaya` under Workers & Pages → Create application → Import a repository if you prefer Git-based builds; use `npm run cf:build` as the build command and `.open-next/assets` as the assets produced by OpenNext.

## Editorial workspace

`/editorial` is a token-protected D1 workspace. An editor can create private drafts and build Stories from validated content blocks: paragraphs, headings, images with accessible metadata, tables, lists, quotations, and editorial callouts. Blocks are responsive, answer-leak checked, and stored as structured D1 records rather than arbitrary HTML. Published Stories are reviewed through isolated working copies: editors can save, discard, or atomically publish a revision without modifying live content mid-review, and the replaced Story is retained in the audit snapshot. Publishing requires an answer-free context summary of at least 150 characters and at least three reviewed Story sections. The browser keeps the supplied token in session storage only.

The Story editor also provides a review-first **Enrich question** action backed by the Cloudflare Workers AI binding. It proposes five to eight encyclopedic sections, contextual rich blocks, source leads, and an answer-status assessment. Generated output is schema-validated and answer-leak checked before it reaches the form; it is never saved or published automatically. Because source leads and factual claims are AI-assisted, an editor must verify them before saving the private revision.

The underlying API accepts `Authorization: Bearer <EDITORIAL_TOKEN>`: `GET` and `POST` on `/api/editorial/questions` list records and create drafts; `GET /api/editorial/questions/:id` loads normalized Story content and recent revision events; and `PATCH` saves Story revisions or performs controlled publication.

## Repository map

- `src/app` — Next.js public routes and editorial entry
- `src/components` — Tambaya visual system and reusable UI
- `src/domain` — domain types, validation, ranking, and public-content safeguards
- `src/data/questions.ts` — canonical development editorial source, including eight rich flagships
- `src/data/repository.ts` — storage-independent question repository contract
- `src/data/d1-repository.ts` — normalized D1 assembly; no public JSON snapshot reads
- `src/data/question-service.ts` — server-only D1/local repository selection
- `migrations` — normalized D1 schema and FTS5 setup
- `scripts/generate-seed.ts` — reproducible normalized seed generator

## Product invariant

No public DTO, schema, route, or fixture contains an answer body. Status fields such as `claimed_status` and `verified_status` describe whether answers exist elsewhere; they do not contain those answers.
