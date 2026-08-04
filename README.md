# Tambaya

Tambaya is a curated graph of **questions worth asking**. Public Tambaya presents a question’s story, history, status metadata, references, and relationships—never an answer.

This repository implements Phase 1, **Tambaya Preview**: landing, exploration, categories, lexical search, rich Question Story pages, related-question navigation, a minimal editorial draft endpoint, normalized D1 content, R2-ready image keys, responsive layouts, and invariant tests.

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The local Next.js experience uses the same 28-question editorial source that generates the normalized D1 seed, so no Cloudflare account is required to evaluate the complete public UI. Eight flagship questions contain individually authored, reviewed Story sections; the remaining questions provide layout-scale development content.

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
4. Create R2: `npx wrangler r2 bucket create tambaya-question-images`.
5. Add `EDITORIAL_TOKEN` as a Worker secret: `npx wrangler secret put EDITORIAL_TOKEN`.
6. Generate, apply, and seed production D1: `npm run seed:generate`, `npm run db:migrate:remote`, then `npx wrangler d1 execute tambaya --remote --file=./scripts/generated-seed.sql`.
7. Build and deploy: `npm run deploy`.

The configuration follows Cloudflare’s current Workers + OpenNext convention: `.open-next/worker.js`, `.open-next/assets`, `nodejs_compat`, and an explicit compatibility date. Connect `jjsanto/tambaya` under Workers & Pages → Create application → Import a repository if you prefer Git-based builds; use `npm run cf:build` as the build command and `.open-next/assets` as the assets produced by OpenNext.

## Editorial API

`POST /api/editorial/questions` creates a D1 draft after question, status, and basic answer-leak validation. Send JSON and, when configured, `Authorization: Bearer <EDITORIAL_TOKEN>`. Phase 1 intentionally stops at minimal editorial entry; enrichment and review orchestration belong to Phase 2.

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
