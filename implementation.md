# Tambaya — Product, UX, Architecture and Implementation Brief

> **Purpose of this document:** provide Codex with a coherent, implementation-ready specification for Tambaya, consolidating the product decisions, UX direction, architecture, AI behavior, content rules, and phased roadmap defined so far.
>
> **Primary implementation rule:** each development phase must deliver observable, deployable user functionality. Infrastructure is introduced only when it enables a visible capability.

---

## 1. Product Summary

**Tambaya** is a collaborative platform for publishing, discovering, rating, classifying, collecting, and connecting **questions worth asking**.

Tambaya is deliberately **not a Q&A site**.

The public platform may contain rich material *around* a question — historical context, origins, illustrations, timelines, references, related questions, why the question matters, and the history of how the question evolved — but it must **never contain the answer to the question**.

### Brand

- **Name:** Tambaya
- **Tagline:** **Questions worth asking.**
- The name comes from Hausa, where *tambaya* means “question / inquiry / to ask.”
- Core brand idea: curiosity, inquiry, intellectual exploration, and connected questions.

### Core public promise

> **Tambaya publishes questions, not answers.**

A second, private layer called **Tambaya Investigate** may help an individual user research answers with AI, but private investigation content must never automatically become public Tambaya answer content.

---

# 2. Product Principles

These principles are non-negotiable and should shape both UX and architecture.

## 2.1 The question is the primary content object

Tambaya treats a question as something worth publishing and exploring in its own right.

A question is not merely a prompt waiting for a reply. It may have:

- authorship
- explanation
- illustration
- categories
- tags
- answer-status classification
- verification
- historical origins
- context
- timeline
- references
- people associated with its history
- relationships to other questions
- ratings
- collections
- provenance
- status history

## 2.2 No public answers

The public Tambaya domain must never provide:

- user answers
- comments that become answers
- accepted answers
- AI-generated answers
- hidden “solution” sections
- “best answer”
- answer threads

Public contextual material may explain **the question**, but it may not resolve it.

### Editorial rule

> **Context may explain the question. Context may not resolve the question.**

## 2.3 Questions connect

Tambaya should progressively become a **graph of human inquiry**.

Questions may connect to other questions through relationships such as:

- `RELATED_TO`
- `LEADS_TO`
- `DEPENDS_ON`
- `REFINES`
- `GENERALIZES`
- `CHALLENGES`
- `PRECEDES`

The graph is not decorative. It is a principal discovery mechanism.

## 2.4 Answer status is metadata, not an answer

The publisher classifies the question’s current answer status.

Recommended public labels:

- **Answered** — sufficiently established answer(s) exist outside Tambaya.
- **Partially answered** — substantial aspects are understood, but meaningful parts remain unresolved.
- **Open** — no sufficiently established answer is currently known.

The publisher provides this classification. **Users do not vote on or edit it.**

Tambaya verifies the classification.

## 2.5 Tambaya verifies publisher claims

The system stores both:

- the publisher’s claimed status
- Tambaya’s verified status / verification outcome

Example:

- Publisher claim: `OPEN`
- Tambaya verification: `VERIFIED`
- Verified status: `OPEN`

Possible verification states:

- `PENDING`
- `VERIFIED`
- `UNCERTAIN`
- `CONTRADICTED`
- `STALE`

If Tambaya cannot verify the publisher’s classification, it should not silently overwrite the publisher’s claim. It should explain the conflict and ask the publisher to review it.

## 2.6 Knowledge changes

Answer status is not permanent.

Tambaya should retain status history and later support re-verification:

```text
2026-08-02   OPEN                  VERIFIED
2028-04-17   OPEN                  VERIFIED
2029-11-06   PARTIALLY_ANSWERED    CHANGE DETECTED
```

This enables a future “Knowledge moved” experience.

## 2.7 AI should create better questions, not flood Tambaya with content

AI may assist with:

- status verification
- duplicate detection
- category/tag suggestions
- context generation
- historical research
- timelines
- references
- relationship suggestions
- answer-leak detection
- moderation

However, editorial and community quality thresholds must prevent mass AI-generated low-quality question publishing.

---

# 3. Brand and Visual Identity

## 3.1 Identity hierarchy

Tambaya should separate the **logo**, **symbol**, and **mascot**.

### Primary logo

Use a simplified wordmark:

**Tambaya**

Optional tagline beneath or alongside it:

**QUESTIONS WORTH ASKING.**

The primary logo should **not contain the meerkat**.

### Brand symbol

Use a simplified **question-network** mark:

- 3–5 connected nodes
- one or more nodes may visually suggest a question mark
- must work at favicon/app-icon sizes
- should communicate: **questions connect to questions**

### Mascot

Use a **meerkat / suricata**.

The meerkat represents:

- curiosity
- observation
- alertness
- exploration
- community

The mascot should **never be shown giving an answer**.

It may:

- observe
- search
- look at a graph
- point toward questions
- explore
- discover
- inspect

## 3.2 Primary palette

Current preferred direction:

- **Deep navy:** approximately `#101B4D`
- **Warm gold:** approximately `#C69A3A`
- **Soft sand:** approximately `#E6D3AA`
- **Meerkat cream:** approximately `#F3E7D0`
- **Near black:** approximately `#202124`
- **White:** `#FFFFFF`

Design should use a predominantly **white / warm-ivory background**, with navy as the main structural color and gold as the accent.

## 3.3 Visual style

- modern
- editorial
- intellectual
- welcoming
- spacious
- sophisticated rather than childish
- serif-inspired display typography for major headings
- clean sans-serif UI typography
- subtle rounded cards
- restrained shadows
- graph/network motifs used selectively

---

# 4. Public Landing Experience

The public landing page should communicate the concept immediately.

## 4.1 Header

Suggested navigation:

- Tambaya wordmark
- Explore
- Collections
- Categories
- About
- How it works
- Search
- Log in
- Sign up

The meerkat should **not** appear in the header logo.

## 4.2 Hero

Primary message direction:

> **The world is full of answers. Tambaya is for the questions.**

Supporting idea:

> Discover, publish, connect, and explore questions worth asking.

Primary CTA:

- **Start exploring**

Secondary CTA:

- **Publish a question**

The hero may use the meerkat interacting with a graph of connected question nodes.

## 4.3 Public sections

The landing page should communicate:

- questions are the primary content
- questions may be **Answered / Partially answered / Open**
- Tambaya verifies status
- questions connect to other questions
- Tambaya enriches questions with stories and context
- Tambaya never publishes answers

Possible sections:

1. Hero
2. What makes Tambaya different
3. Answer-status classification
4. Featured / flagship questions
5. Browse categories
6. How it works
   - Publish
   - Verify
   - Connect
   - Discover
7. Connected-question visual
8. Closing CTA

Closing statement:

> **No answers. Just questions worth asking.**

---

# 5. Public Question Page

The question page is the core experience.

Example:

```text
What is consciousness?

OPEN ✓ Verified
Philosophy · Neuroscience · Cognitive Science

[ Save ] [ Rate ] [ Explore connections ] [ Investigate ]
```

The public page may include the following tabs / sections:

- **Story** (default)
- **Connections**
- **Timeline**
- **References**
- **Activity**

Avoid a generic “Overview” tab if “Story” can communicate the Tambaya concept more distinctively.

## 5.1 Question Story / Context Layer

Tambaya may automatically enrich a question with:

### Origins

- when the question or recognizable forms of it first appeared
- earliest known formulations
- historical context

### How the question evolved

- how the wording changed
- how different disciplines framed it
- shifts in terminology

### Why people started asking it

- historical
- scientific
- cultural
- technological triggers

### Why it matters

Explain the significance of the question without implying an answer.

### Key moments

A timeline of events that changed how the question was formulated or investigated.

### People associated with the question

People may be described in relation to the history of the **question**, not by summarizing their answer.

### Where it appears

Disciplines, fields, cultures, books, debates, etc.

### Related questions

Connected-question graph and curated related questions.

## 5.2 Example of allowed vs forbidden context

Allowed:

> A twentieth-century experiment renewed scientific interest in the question.

Forbidden:

> The experiment proved that X causes Y.

Allowed:

> Ancient thinkers considered forms of this question long before modern scientific methods existed.

Forbidden:

> Ancient thinkers correctly concluded that the answer was X.

---

# 6. Answer-Leak Prevention

Answer leakage is a core safety/editorial mechanism.

Every generated contextual block should be checked by a separate evaluation step.

The evaluator should determine whether text:

1. explicitly answers the central question
2. strongly implies an answer
3. privileges one candidate answer as correct
4. reveals the conclusion of cited research
5. resolves an important sub-question
6. provides wording that effectively functions as an answer

Suggested evaluator result:

```json
{
  "safe": false,
  "risk": 0.91,
  "reason": "The second paragraph states the causal explanation directly.",
  "spans": [
    {
      "start": 124,
      "end": 196,
      "reason": "Answer leakage"
    }
  ]
}
```

Unsafe content must be regenerated or routed for human review.

Do not use the same generation result as its own safety authority. Prefer a second evaluation pass / model / prompt.

---

# 7. Logged-In Experience

After login, the user should **not** be sent to a conventional admin-style dashboard.

Tambaya should immediately return the user to **questions**.

The authenticated home should feel like a personalized **map/feed of inquiry**.

## 7.1 Logged-in navigation

Suggested:

- Tambaya
- Explore
- Following
- Collections
- Categories
- Search
- **Publish a Question**
- Notifications
- Profile

## 7.2 Main personalized sections

Recommended hierarchy:

1. **Questions worth your attention**
2. **Continue exploring**
3. **At the frontier — Open questions**
4. **Connected to your interests**
5. **Knowledge moved — recent status changes**
6. **Your collections**
7. **Your questions / publishing activity**
8. **Discover something unexpected**

## 7.3 Question cards

A question card should contain more than a one-line forum post.

Example:

```text
Can consciousness exist without memory?

OPEN ✓ Verified
Neuroscience · Philosophy · Cognition
★ 4.7 · 83 connections

This question emerged from attempts to distinguish awareness,
identity and memory...

[ View story ] [ Explore connections ] [ Save ]
```

## 7.4 Continue exploring

Track exploration paths and graph progress.

Example:

> **What is consciousness?**  
> You explored 6 of its 156 connected questions.

Provide a small graph showing explored vs unexplored nodes.

## 7.5 At the frontier

A dedicated section for questions currently verified as `OPEN`.

## 7.6 Knowledge moved

Eventually show answer-status changes for followed questions.

Example:

> **Open → Partially answered**  
> Tambaya detected new authoritative evidence and reverified this question.

Tambaya may explain **why the classification changed**, but not expose the answer.

## 7.7 Collections

Users may maintain collections such as:

- Questions about Learning
- Questions Every Programmer Should Consider
- AI & Consciousness
- Things I Still Don’t Understand
- Questions for My Students

Collections may eventually be:

- private
- public
- collaborative

## 7.8 Profiles

A profile should represent an intellectual footprint rather than vanity engagement.

Possible metrics:

- questions published
- questions explored
- connections contributed
- collections created
- questions saved
- topic interests

Prefer wording such as:

> **Questions I’m known for**

rather than generic “Top posts.”

## 7.9 Activity

Prioritize meaningful events:

- a question’s status changed
- a question was added to a collection
- a new connected question appeared
- a published question reached a save milestone
- a question was reverified

Avoid shallow engagement notifications.

---

# 8. Ratings

Ratings evaluate the **question**, not the correctness of an answer.

Initial MVP may use:

- 1–5 overall rating

Later, richer dimensions may include:

- importance
- originality
- depth
- clarity
- difficulty

Do not rank by raw arithmetic average alone.

Use a ranking approach that accounts for sample size (e.g. Bayesian or Wilson-style scoring).

Potential discovery pages:

- Most important
- Most original
- Most difficult
- Highest-rated open questions
- Most connected
- Recently rising

---

# 9. Categories, Tags and Classification

Questions should support:

- top-level category
- subcategory
- tags
- cross-disciplinary tags
- answer status
- verification state
- language
- relationship types
- editorial / community provenance

Possible cross-cutting tags:

- `#unsolved`
- `#thought-experiment`
- `#beginner`
- `#research`
- `#controversial`
- `#counterfactual`
- `#educational`
- `#historical`

Taxonomy should evolve; avoid overdesigning it before real content exists.

---

# 10. Question Graph

The graph is a central Tambaya differentiator.

## 10.1 Relationship model

Recommended relation enum:

```text
RELATED_TO
LEADS_TO
DEPENDS_ON
REFINES
GENERALIZES
CHALLENGES
PRECEDES
```

Represent relationships as explicit edges.

Example:

```text
Can machines think?
        |
     LEADS_TO
        v
What does thinking mean?
      /        \
     v          v
Can thinking   Is consciousness
exist without  necessary for thought?
language?
```

## 10.2 Graph UX

Users should eventually be able to:

- open a graph from any question
- zoom and pan
- follow branches
- inspect status badges on nodes
- open question previews
- track explored/unexplored nodes
- find paths between topics
- navigate backward through an exploration trail

## 10.3 “Surprise me”

Include a serendipity mechanism:

> **Take me somewhere unexpected**

This should deliberately surface a high-quality question outside the user’s normal topic bubble.

---

# 11. Publishing Workflow

The public/community publishing flow should be built only after the editorial workflow is stable.

## 11.1 User input

1. User writes question
2. Optional explanation
3. Optional illustration
4. User selects answer status:
   - Answered
   - Partially answered
   - Open

## 11.2 Automated pipeline

```text
Question submitted
      |
      v
Basic validation
      |
      v
Duplicate detection
      |
      v
Save as DRAFT
      |
      v
Background enrichment
      |
      +--> category/tag suggestions
      +--> status verification
      +--> historical origins
      +--> Question Story
      +--> timeline
      +--> references
      +--> related-question suggestions
      +--> answer-leak detection
      |
      v
Publisher review
      |
      v
Publish
```

## 11.3 Publisher ownership vs Tambaya verification

Publisher controls:

- question wording
- explanation
- illustration
- claimed status
- whether to publish

Tambaya controls:

- verification result
- AI-generated enrichment suggestions
- moderation
- answer-leak validation

If a publisher claims `OPEN` and Tambaya finds evidence of established answers:

> Tambaya should say it cannot verify the claim and ask the publisher to review it.

Do not silently rewrite the publisher’s claim.

---

# 12. Editorial Seeding Strategy

Tambaya should launch with a substantial editorial corpus.

## 12.1 Target corpus

Recommended:

- **Internal prototype:** 150–250 questions
- **Closed alpha:** 400–600
- **Public beta:** 1,000–1,500
- **Public launch:** approximately **2,000**
- **First 3–6 months:** 3,000–5,000

## 12.2 Public-launch target

Approximately:

- **2,000 editorial questions**
- **100 flagship questions**
- **~15,000 meaningful question-to-question connections**

## 12.3 Flagship questions

About 100 questions should receive exceptional editorial treatment and define the quality bar.

Examples:

- What is consciousness?
- Are we alone in the universe?
- Is mathematics discovered or invented?
- Can machines understand?
- Why do we dream?
- Is time fundamental?
- What makes something beautiful?
- Why is there something rather than nothing?

## 12.4 Suggested initial subject distribution

Indicative only:

| Domain | Questions |
|---|---:|
| Science & Nature | 350 |
| Technology & AI | 300 |
| Philosophy | 250 |
| Society & Culture | 200 |
| Mathematics | 175 |
| Psychology & Mind | 150 |
| History | 125 |
| Economics & Business | 125 |
| Arts & Humanities | 100 |
| Health & Human Biology | 100 |
| Environment & Future | 75 |
| Life & Personal | 50 |
| **Total** | **2,000** |

## 12.5 Status mix

Avoid making Tambaya look like only a database of unsolved problems.

Indicative balance:

- ~35% Answered
- ~35% Partially answered
- ~30% Open

This is not a hard quota.

---

# 13. Tambaya Investigate

Tambaya may provide an AI-assisted capability to **find and investigate answers**, but it must be explicitly separated from public Tambaya.

## 13.1 Product rule

> **Tambaya publishes questions.  
> Tambaya helps individuals investigate answers.  
> Tambaya never publishes those answers.**

## 13.2 Entry point

On a public question page:

- View Story
- Explore Connections
- Save
- **Investigate**

Clicking **Investigate** enters a clearly private research workspace.

## 13.3 Private workspace capabilities

May include:

- AI chat
- relevant papers
- books
- authoritative sources
- competing approaches
- evidence for / against approaches
- reading paths
- personal notes
- saved findings
- generated research brief

## 13.4 AI behavior should depend on question status

### Answered

Help locate and understand established answers.

### Partially answered

Explain what is established and what remains unresolved.

### Open

Map hypotheses, evidence, research directions, and uncertainty. Do **not** fabricate a definitive answer.

## 13.5 No “publish answer” operation

There must be no automatic operation equivalent to:

```text
Publish this AI answer to Tambaya
```

Instead, support:

> **Create a connected question from this investigation**

Product loop:

```text
Question
   |
   v
Investigate
   |
   v
Discover unresolved issue
   |
   v
New question draft
   |
   v
Tambaya graph
```

This is an important growth mechanism.

---

# 14. Cloudflare-First Architecture

Tambaya should move as much infrastructure as practical to Cloudflare.

## 14.1 Architectural objective

Avoid operating conventional servers, Redis/Celery clusters, S3, a separate search cluster, and an independent vector database unless later scale genuinely requires them.

## 14.2 Recommended stack

| Requirement | Choice |
|---|---|
| Web frontend | **Next.js on Cloudflare Workers via OpenNext** |
| API/backend | **Cloudflare Workers / TypeScript** |
| Optional routing layer | **Hono** |
| Mobile backend | Same Workers API |
| Transactional DB | **Cloudflare D1** |
| Lexical search | **D1 FTS5** |
| Semantic search | **Cloudflare Vectorize** |
| Embeddings | **Workers AI** |
| AI provider gateway | **AI Gateway** |
| Native inference | **Workers AI** |
| Private AI agent | **Cloudflare Agents SDK** |
| Stateful private investigations | **Durable Objects / SQLite storage** |
| Managed RAG / corpus search | **AI Search** |
| Object storage | **R2** |
| Image delivery/transformation | **Cloudflare Images** |
| Long-running pipelines | **Cloudflare Workflows** |
| Event bus | **Cloudflare Queues** |
| Event/product analytics | **Workers Analytics Engine** |
| Low-consistency config/cache | **Workers KV** |
| Edge/browser research | **Browser Rendering / browser automation capability as available** |
| Scheduler | **Workers Cron + Workflows** |
| Security | **Cloudflare WAF / rate limiting / Turnstile** |
| CDN/DNS/TLS | **Cloudflare** |
| Public auth | External specialist IdP initially |

> **Implementation note:** Cloudflare capabilities evolve quickly. Before implementation, verify current product names, limits, bindings, SDK APIs, pricing, and OpenNext support against current Cloudflare documentation.

---

# 15. Cloudflare Component Responsibilities

## 15.1 Workers

Primary runtime for:

- API endpoints
- server-rendered web application
- authorization checks
- lightweight orchestration
- search composition
- cache control
- API façade for mobile

Prefer TypeScript server-side to keep the Cloudflare runtime simple.

## 15.2 D1

Use as system of record for:

- users/profile references
- questions
- context
- claimed/verified status
- categories
- tags
- relationships
- ratings
- collections
- follows
- saved questions
- verification metadata
- timeline events
- references metadata

Do not use D1 as a high-volume clickstream database.

## 15.3 Analytics Engine

Use for high-volume events:

- question impressions
- question views
- recommendation impressions
- recommendation clicks
- graph interactions
- searches
- investigation starts
- anonymous aggregate behavior

Durable user state still goes to D1.

## 15.4 Vectorize

Use for:

- semantic search
- duplicate detection
- related-question candidates
- recommendation similarity
- cross-domain discovery
- graph-edge candidate generation

## 15.5 R2

Use for:

- question illustrations
- profile assets
- collection covers
- generated media
- research artifacts
- source snapshots where permitted
- investigation exports
- uploaded source documents

## 15.6 Cloudflare Images

Use for:

- responsive delivery
- resizing
- cropping
- optimization
- thumbnails
- mobile/desktop variants

## 15.7 Workflows

Use for durable question enrichment and publication processes.

Example:

```text
TambayaPublishWorkflow
  -> normalize
  -> duplicate check
  -> status verification
  -> classify/tags
  -> historical research
  -> Question Story
  -> timeline
  -> people/entities
  -> references
  -> relationship suggestions
  -> answer-leak check
  -> WAIT FOR PUBLISHER APPROVAL
  -> publish
  -> update search/indexes
  -> emit events
```

Workflows should be used because they can:

- retry
- pause
- wait for publisher review
- coordinate long-running AI/research jobs

## 15.8 Queues

Use as asynchronous event bus.

Example domain events:

- `QUESTION_PUBLISHED`
- `QUESTION_RATED`
- `QUESTION_CONNECTED`
- `QUESTION_STATUS_CHANGED`
- `QUESTION_SAVED`
- `COLLECTION_UPDATED`

Consumers may update:

- notifications
- recommendations
- indexes
- analytics
- related-question candidates

## 15.9 AI Gateway

All external/native model calls should pass through one AI abstraction layer.

Application code should invoke semantic tasks, not provider-specific APIs.

Conceptual service:

```ts
interface AIService {
  generateQuestionContext(...): Promise<...>;
  verifyAnswerStatus(...): Promise<...>;
  suggestConnections(...): Promise<...>;
  suggestTags(...): Promise<...>;
  detectAnswerLeak(...): Promise<...>;
  buildTimeline(...): Promise<...>;
  investigate(...): Promise<...>;
}
```

Behind this service, route to:

- Workers AI
- OpenAI
- Anthropic
- Google
- other providers if needed

Use different models for different tasks.

## 15.10 Durable Objects / Agents

Each private investigation may be modeled as a durable stateful object.

An investigation may contain:

- conversation
- source list
- research plan
- notes
- progress
- tool calls
- generated artifacts

This is in the **private investigation domain**, not the public question domain.

## 15.11 KV

Use only for data that tolerates eventual consistency:

- feature flags
- prompt versions
- model routing config
- locale config
- public cached metadata
- category configuration

Do not use KV for:

- ratings
- answer status
- moderation decisions
- publication state

---

# 16. Architecture Boundary: Public vs Private

This distinction must exist in UX, APIs, database boundaries, and code ownership.

```text
PUBLIC TAMBAYA DOMAIN
---------------------
Questions
Question Story
Context
References
Status metadata
Ratings
Connections
Collections

NO ANSWERS

==================================================

PRIVATE INVESTIGATE DOMAIN
--------------------------
AI research
Answers
Hypotheses
Notes
Source summaries
Research briefs
Personal findings
```

No API endpoint should allow investigation answers to be published directly into public question content.

There may be an endpoint to derive a **new question draft** from an investigation.

Example:

```text
POST /api/investigations/:id/derive-question
```

There should not be:

```text
POST /api/investigations/:id/publish-answer
```

---

# 17. Initial Data Model

The following model is illustrative. Codex may refine names, normalization, indexes, and migrations, but must preserve the domain semantics.

## 17.1 Question

```text
Question
--------
id
publisher_id
question_text
slug
language
publication_state
visibility
created_at
updated_at
published_at

claimed_status
verified_status
verification_state
verification_confidence
last_verified_at

context_summary
importance_statement
```

Recommended enums:

```text
AnswerStatus:
  ANSWERED
  PARTIALLY_ANSWERED
  OPEN
```

```text
VerificationState:
  PENDING
  VERIFIED
  UNCERTAIN
  CONTRADICTED
  STALE
```

## 17.2 Question context

Avoid one giant unstructured AI blob.

Possible structured fields/entities:

```text
QuestionContext
---------------
question_id
origins
historical_background
why_people_started_asking
why_it_matters
where_it_appears
context_summary
generated_by_ai
reviewed_by_publisher
```

Separate entities:

- TimelineEvent
- PersonAssociation
- Reference
- QuestionImage
- Category
- Tag

## 17.3 Relationship

```text
QuestionRelationship
--------------------
id
source_question_id
target_question_id
relationship_type
created_by
confidence
verified
created_at
```

## 17.4 Rating

```text
Rating
------
user_id
question_id
rating
created_at
updated_at
```

Potential later dimensions:

- importance
- clarity
- originality
- depth

## 17.5 Verification

```text
Verification
------------
id
question_id
claimed_status
verified_status
verification_state
confidence
checked_at
verification_version
model_version
```

```text
VerificationEvidence
--------------------
id
verification_id
source_url
source_type
title
publisher
publication_date
retrieved_at
evidence_summary
```

Public UI may show that sources were used without summarizing an answer.

## 17.6 References

Reference purpose should be explicit.

Potential enum:

```text
HISTORICAL_CONTEXT
STATUS_VERIFICATION
ORIGIN
TIMELINE
BACKGROUND
```

## 17.7 Collections

```text
Collection
----------
id
owner_id
title
description
visibility
collaborative
created_at
```

```text
CollectionQuestion
------------------
collection_id
question_id
position
added_by
added_at
```

## 17.8 Investigation

```text
Investigation
-------------
id
user_id
question_id
created_at
updated_at
private
```

Potential child data:

- InvestigationMessage
- InvestigationSource
- InvestigationNote
- InvestigationArtifact

---

# 18. Search and Recommendation

Tambaya has three conceptual search/discovery modes.

## 18.1 Lexical search

D1 FTS5.

Example:

> consciousness memory

## 18.2 Semantic search

Vectorize.

Example:

> questions about whether subjective awareness requires recollection

should work even if exact keywords differ.

## 18.3 Graph discovery

Recursive graph traversal over question relationships.

## 18.4 Recommendation scoring

Do not optimize only for engagement.

Conceptual score:

```text
recommendation_score =
    topic_similarity
  + question_quality
  + connection_relevance
  + novelty
  + status_interest
  + trusted_rating
  + serendipity_score
  - already_seen_penalty
```

Serendipity is an intentional product value.

---

# 19. Reverification

Later phases should periodically re-check answer status.

Priority may depend on:

- question status
- domain
- age of verification
- scientific/technical change rate
- popularity/following
- recent external evidence

Example:

```text
OPEN + fast-moving scientific domain + >90 days since verification
```

gets higher re-verification priority than:

```text
ANSWERED + stable historical question
```

When status may have changed:

1. detect
2. collect evidence
3. notify publisher
4. reverify
5. update status history
6. notify followers if appropriate

This powers **Knowledge moved**.

---

# 20. Moderation and Abuse Prevention

First-line automated moderation should detect:

- spam
- duplicate questions
- abusive content
- personal data leakage
- answer leakage
- low-quality formulation
- SEO spam
- bulk AI-generated question dumping

Potential roles/capabilities:

- anonymous
- registered user
- publisher
- trusted publisher
- moderator
- administrator

Prefer permissions/capabilities over UI-role hardcoding.

Possible permission examples:

- `question:create`
- `question:edit-own`
- `question:publish`
- `context:edit-own`
- `verification:view-details`
- `moderation:review`

Use:

- Cloudflare WAF
- rate limiting
- Turnstile
- reputation-based publishing limits

---

# 21. Authentication

Use a specialist public identity provider initially.

Do not build consumer auth from scratch unless there is a compelling reason.

Cloudflare Access may be appropriate for:

- admin interface
- internal editorial tools
- moderation console

Public account/profile references can be stored in D1.

---

# 22. Mobile Strategy

Do **not** build native mobile first.

The public and logged-in web experience must be responsive from Phase 1.

Build native mobile after usage validates which flows deserve native treatment.

Recommended native stack:

- React Native
- Expo

Use the same Workers API.

Potential native-first feature:

### Daily Question

Example notification:

> **Today’s question**  
> Can a society remember something that none of its individual members remember?

---

# 23. Phased Implementation Roadmap

Each phase must end in deployed, observable functionality.

---

## Phase 1 — Tambaya Preview

### Goal

Prove that people enjoy exploring rich questions without answers.

### User-visible functionality

- public landing page
- Explore Questions
- Categories
- Search
- responsive question pages
- Question Story
- answer-status display
- tags
- references
- basic related questions

No login required.

### Initial editorial content

- 100–150 questions
- ~20 flagship questions

### Technical scope

- Next.js / OpenNext
- Cloudflare Workers
- D1
- D1 FTS
- R2
- Cloudflare Images
- CDN/WAF
- simple internal editorial CRUD

### Completion criterion

An unfamiliar user can browse Tambaya for 10+ minutes and move through multiple questions without explanation from the team.

---

## Phase 2 — Tambaya Editorial

### Goal

Allow the editorial team to create rich Tambaya pages efficiently.

### User-visible improvement

Questions receive:

- richer Story
- historical origins
- timelines
- people/entities
- references
- verified answer status
- better related questions

### Editorial UI

- Drafts
- Pending verification
- AI enrichment complete
- Needs review
- Published
- Verification problems

### Technical additions

- Workers AI
- AI Gateway
- Workflows
- Queues
- Browser research capability where needed
- answer-leak detector

### Corpus target

- 300–500 questions
- 40–50 flagship questions

### Completion criterion

An editor can turn one well-written question into a Tambaya-quality page mostly by reviewing generated work rather than manually researching everything.

---

## Phase 3 — Tambaya Personal

### Goal

Make Tambaya personalized.

### User-visible functionality

- sign up / log in
- rate
- save
- follow question
- follow category
- recently viewed
- Continue exploring
- My saved questions
- My interests
- personalized logged-in home

### Technical additions

- external identity provider
- D1 user data
- Analytics Engine
- KV for config/cache

### Completion criterion

Users with different interests/behavior receive materially different home experiences.

---

## Phase 4 — Tambaya Graph

### Goal

Make connected-question exploration a defining experience.

### User-visible functionality

- interactive question graph
- relation types
- graph navigation
- semantic search
- exploration history
- Surprise me
- better duplicate detection
- question recommendations based on graph + semantic similarity

### Technical additions

- Vectorize
- embeddings
- graph traversal logic

### Corpus target

- 700–1,000 questions
- 6,000–10,000 connections

### Completion criterion

A user can begin from one question and spend several minutes navigating entirely through question connections.

---

## Phase 5 — Tambaya Community

### Goal

Allow community publishing without collapsing quality.

### User-visible functionality

- Publish a Question
- status claim
- automated verification
- AI context generation
- duplicate checking
- suggested tags/categories
- Story generation
- connection suggestions
- publisher preview/review
- moderation feedback

### Moderation

- spam controls
- duplicate controls
- publishing rate limits
- reputation
- moderation queue

### Completion criterion

A high-quality contributor can publish a Tambaya-quality question without editorial intervention.

> **This marks MVP completion.**

---

## Phase 6 — Tambaya Living Knowledge

### Goal

Make Tambaya a living map of how knowledge changes.

### User-visible functionality

- scheduled re-verification
- Knowledge moved
- status history
- richer following
- notifications
- public/private/collaborative collections

### Completion criterion

Users have a reason to return because questions and knowledge have changed, not merely because new content was added.

---

## Phase 7 — Tambaya Investigate

### Goal

Provide private AI-assisted research without polluting public Tambaya with answers.

### User-visible functionality

- Investigate button
- private AI workspace
- research sources
- notes
- saved findings
- source-aware AI
- status-aware AI behavior
- generate new connected question from investigation

### Technical additions

- Agents SDK
- Durable Objects
- AI Search
- R2 research corpus
- deeper research Workflows

### Monetization possibility

Potential split:

- Tambaya Free
- Tambaya Investigate / Pro

### Completion criterion

Users can deeply research questions privately while the public question page remains answer-free.

---

## Phase 8 — Tambaya Mobile

### Goal

Deliver a native mobile experience based on proven product behavior.

### Stack

- React Native
- Expo
- existing Workers API

### Functionality

- personalized question feed
- explore
- touch-friendly graph
- save
- rate
- collections
- notifications
- publish
- Investigate
- Daily Question

---

## Phase 9 — Public Launch Hardening

### Goal

Prepare Tambaya for serious public growth.

### Launch content target

- ~2,000 editorial questions
- ~100 flagship questions
- ~15,000 meaningful connections

### Product features

- Great Open Questions
- Recently Changed
- Curated Collections
- Question of the Day
- Editorial Picks
- Community Picks
- public Explore map

### Operational scope

- moderation tooling
- backups / PITR
- observability
- privacy / GDPR
- content reporting
- editorial governance
- AI audit trails
- verification audit history
- cost monitoring
- abuse/rate limiting
- source provenance

---

# 24. Implementation Rule: Observable Functionality per Phase

Do not create infrastructure-only roadmap phases.

Bad:

> Phase 2 — implement Vectorize.

Good:

> Phase 4 — users can semantically discover related questions.

Bad:

> Phase 3 — implement Workflows.

Good:

> Phase 2 — Tambaya automatically researches and enriches an editor’s question.

Bad:

> Phase 7 — implement Durable Objects.

Good:

> Phase 7 — a private Investigation remembers the user’s research state.

Infrastructure exists to enable observable product behavior.

---

# 25. Suggested Repository Structure

Codex may adapt this, but a monorepo is recommended.

```text
tambaya/
├── apps/
│   ├── web/                  # Next.js web application
│   ├── mobile/               # React Native / Expo (later phase)
│   └── editorial/            # optional separate editorial/admin UI
│
├── packages/
│   ├── db/                   # D1 schema, migrations, repository layer
│   ├── domain/               # domain types, enums, validation
│   ├── ui/                   # shared design system
│   ├── ai/                   # provider abstraction, prompts, evaluators
│   ├── search/               # FTS + Vectorize composition
│   ├── graph/                # relationship logic and traversal
│   ├── auth/                 # identity integration
│   └── observability/
│
├── workers/
│   ├── api/                  # if API worker split is desired
│   ├── queue-consumer/
│   ├── scheduled/
│   └── workflows/
│
├── scripts/
│   ├── seed/
│   └── editorial-import/
│
├── docs/
│   ├── product.md
│   ├── architecture.md
│   ├── domain-model.md
│   └── decisions/
│
├── wrangler.toml / wrangler.jsonc
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

Prefer a **modular monolith** initially. Do not create microservices unless actual scale or isolation needs justify them.

---

# 26. API Surface — Initial Direction

Exact routes may evolve.

## Public

```text
GET  /api/questions
GET  /api/questions/:slug
GET  /api/questions/:id/connections
GET  /api/categories
GET  /api/search
GET  /api/collections/:id
```

## Authenticated

```text
POST   /api/questions/:id/rating
PUT    /api/questions/:id/save
DELETE /api/questions/:id/save
PUT    /api/questions/:id/follow
DELETE /api/questions/:id/follow

GET    /api/me/home
GET    /api/me/saved
GET    /api/me/history
GET    /api/me/collections
```

## Publishing

```text
POST   /api/questions/drafts
PATCH  /api/questions/drafts/:id
POST   /api/questions/drafts/:id/enrich
POST   /api/questions/drafts/:id/review
POST   /api/questions/drafts/:id/publish
```

## Investigate

```text
POST /api/questions/:id/investigations
GET  /api/investigations/:id
POST /api/investigations/:id/messages
POST /api/investigations/:id/notes
POST /api/investigations/:id/derive-question
```

Do not implement any public-answer publishing endpoint.

---

# 27. Phase 1 — Immediate Codex Implementation Scope

Codex should begin with **Phase 1 — Tambaya Preview**.

Do not build Phase 2+ infrastructure unless a small abstraction is necessary to avoid obvious rework.

## 27.1 Deliverables

Build and deployable locally / to Cloudflare:

1. Tambaya landing page
2. Explore Questions page
3. Category browsing
4. Search
5. Public Question Story page
6. Answer-status badges
7. Tags
8. References
9. Basic related-question navigation
10. responsive layouts
11. minimal editorial CRUD for adding seeded questions
12. seed script / fixtures

## 27.2 Phase 1 sample data

Seed at least 20–30 representative questions in development, spanning:

- Science
- Technology & AI
- Philosophy
- Mathematics
- Psychology & Mind
- History
- Society

Include all three answer statuses.

Use sufficiently rich dummy/editorial-safe Story fields to exercise the layout.

Do not generate actual answers.

## 27.3 Phase 1 UX acceptance criteria

- landing page clearly communicates that Tambaya is not Q&A
- a visitor can discover questions without authentication
- a question page feels rich even though it contains no answer
- answer status is visible
- related questions allow continued navigation
- design uses Tambaya navy/gold/white visual identity
- logo is simplified wordmark/network mark
- meerkat appears as mascot/illustration, not in every UI element
- mobile responsive behavior is acceptable

## 27.4 Phase 1 technical acceptance criteria

- runs on Cloudflare Workers-compatible runtime
- D1-backed persistence
- migration setup
- R2-ready image references
- TypeScript throughout
- no unnecessary server dependencies
- code organized by domain
- basic automated tests for:
  - question retrieval
  - status enum validation
  - search
  - relationships
  - public rendering not exposing any `answer` field
- no schema field named `answer` in the public question domain unless explicitly used only as metadata such as `answer_status`

---

# 28. Testing Requirements

At minimum:

## Unit tests

- status validation
- relationship validation
- rating logic
- question slug generation
- public content sanitizer
- answer-leak policy helpers

## Integration tests

- D1 repositories
- search
- question page assembly
- related-question queries
- publishing workflow later

## End-to-end tests

At key phases:

- landing -> explore -> question -> related question
- login -> save/rate
- publish draft -> enrich -> review -> publish
- investigate -> derive question

## Product invariant tests

Add tests specifically protecting Tambaya’s unique rule.

Examples:

- public question DTO contains no answer body
- public API cannot retrieve investigation messages
- investigation API requires ownership/auth
- no route can publish investigation content as public answer
- generated Story content passes answer-leak evaluator before publication

---

# 29. Observability

From the beginning, capture:

- errors
- request latency
- D1 query latency
- page-level performance
- search success/failure
- graph navigation events
- question view depth
- question-to-question navigation
- AI workflow failures later
- model/provider cost later

Do not over-collect personal data.

Product analytics should help answer:

- Do users browse multiple questions?
- How often do they follow connections?
- How long do they remain in Story content?
- Do they save/rate?
- Does personalization improve exploration?
- Does the graph outperform plain related-question lists?

---

# 30. Key Product Metrics

Early-stage metrics should favor intellectual exploration, not generic social engagement.

Potential metrics:

- questions viewed per session
- percentage of sessions reaching a second question
- graph transitions per session
- saved questions per active user
- collection creation
- follow rate
- percentage of users returning to continue an exploration
- average number of meaningful connections per question
- publisher acceptance/rejection rate of AI-generated Story content
- verification success rate
- answer-leak regeneration rate

Avoid optimizing solely for:

- time on site
- notification opens
- profile views
- raw post count

---

# 31. Open Decisions / Do Not Over-Commit Yet

These can remain configurable until real usage provides evidence:

- exact rating dimensions beyond 1–5
- exact taxonomy depth
- exact graph visualization library
- final public identity provider
- final AI model/provider choices
- whether AI Search is needed before Investigate
- whether D1 remains primary at very large scale
- whether PostgreSQL via Hyperdrive becomes necessary later
- whether a dedicated graph DB is ever required
- premium pricing / monetization details
- native mobile timing

The architecture should preserve an escape hatch:

```text
MVP / early growth
Workers + D1

if needed later
Workers + Hyperdrive + PostgreSQL
```

while leaving the rest of the Cloudflare-first architecture intact.

---

# 32. Definition of Tambaya

The implementation should always be checked against this statement:

> **Tambaya is a collaborative, curated graph of questions worth asking.**
>
> A question may have a story, history, context, illustrations, categories, tags, references, ratings, answer-status metadata, verification, and relationships to other questions.
>
> **Public Tambaya never contains answers.**
>
> Tambaya may privately help a user investigate answers with AI, but that private investigation is architecturally separated from the public question domain.
>
> The product succeeds when a user arrives for one question and leaves having discovered several better ones.

---

# 33. Codex Starting Instruction

Begin by implementing **Phase 1 — Tambaya Preview**.

Do not build Phase 2+ infrastructure unless a small abstraction is necessary to avoid obvious rework.

Priority order:

1. establish project/workspace
2. establish Tambaya visual system
3. establish D1 schema/migrations
4. seed representative editorial questions
5. implement landing page
6. implement Explore page
7. implement question Story page
8. implement categories/tags/status UI
9. implement lexical search
10. implement basic question relationships
11. implement responsive behavior
12. add tests
13. document local development and Cloudflare deployment

At the end of Phase 1, Tambaya must be a coherent, usable public site — not a collection of backend components.
