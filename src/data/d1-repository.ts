import {
  slugifyQuestion,
  type AnswerStatus,
  type AnswerAttempt,
  type EditorialReview,
  type PublicQuestion,
  type QuestionReference,
  type RelationshipType,
  type StoryBlock,
  type TimelineEvent,
} from "@/domain/question";
import type { D1DatabaseLike } from "@/types/cloudflare";
import type {
  CategorySummary,
  QuestionFilters,
  QuestionGraph,
  QuestionGraphNode,
  QuestionRepository,
  QuestionRow,
  TagSummary,
} from "./repository";

type SectionRow = {
  section_type: keyof PublicQuestion["editorialReview"];
  body: string;
  provenance: EditorialReview["provenance"];
  reviewed_at: string;
  answer_leak_state: EditorialReview["answerLeakState"];
};
type TimelineRow = { display_date: string; title: string; description: string };
type ReferenceRow = {
  title: string;
  publisher: string;
  source_url: string;
  purpose: QuestionReference["purpose"];
};
type AnswerAttemptRow = {
  title: string;
  author: string;
  publisher: string;
  source_url: string;
  publication_date: string;
  approach: string;
  scope: string;
  significance: string;
  unresolved: string;
  outcome_type?: AnswerAttempt["outcomeType"];
  outcome_note?: string;
};
type PhrasingRow={text:string;period:string;language:string;source_url:string|null;source_title:string|null;note:string|null};
type TagRow = { name: string };
type StoryRow = {
  id: string;
  section_key: string;
  kicker: string;
  title: string;
  provenance: EditorialReview["provenance"];
  answer_leak_state: EditorialReview["answerLeakState"];
  reviewed_at: string;
};
type ParagraphRow = { section_id: string; body: string };
type BlockRow = {
  section_id: string;
  block_type: StoryBlock["type"];
  data_json: string;
};
type PersonRow = { name: string; period: string; association: string };
type TermRow = { term: string; description: string };
type BranchRow = { question_text: string; relationship_type: RelationshipType };
type SummaryRow = { question_id: string; body: string };
type QuestionTagRow = { question_id: string; name: string };
type CategoryRow = { name: string; slug: string; is_primary: number };
type StatusEventRow = { occurred_at:string; from_status:AnswerStatus|null; to_status:AnswerStatus; evidence_url:string|null; verifier_type:"MIGRATION"|"EDITORIAL"|"INSTITUTION"|"SYSTEM"; verifier_name:string|null; note:string|null };

export class D1QuestionRepository implements QuestionRepository {
  constructor(private readonly db: D1DatabaseLike) {}

  private async summarize(rows: QuestionRow[]): Promise<PublicQuestion[]> {
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    const chunks = Array.from(
      { length: Math.ceil(ids.length / 50) },
      (_, index) => ids.slice(index * 50, index * 50 + 50),
    );
    const results = await Promise.all(
      chunks.flatMap((chunk) => {
        const placeholders = chunk.map(() => "?").join(",");
        return [
          this.db
            .prepare(
              `SELECT question_id,body FROM question_content_sections WHERE question_id IN (${placeholders}) AND section_type='SUMMARY' AND publication_state='PUBLISHED'`,
            )
            .bind(...chunk)
            .all<SummaryRow>(),
          this.db
            .prepare(
              `SELECT qt.question_id,t.name FROM question_tags qt JOIN tags t ON t.id=qt.tag_id WHERE qt.question_id IN (${placeholders}) ORDER BY t.name`,
            )
            .bind(...chunk)
            .all<QuestionTagRow>(),
        ];
      }),
    );
    const summaryRows = results
      .filter((_, index) => index % 2 === 0)
      .flatMap((result) => (result.results ?? []) as SummaryRow[]);
    const tagRows = results
      .filter((_, index) => index % 2 === 1)
      .flatMap((result) => (result.results ?? []) as QuestionTagRow[]);
    const summaries = new Map(
      summaryRows.map((item) => [item.question_id, item.body]),
    );
    const tags = new Map<string, string[]>();
    for (const item of tagRows)
      tags.set(item.question_id, [
        ...(tags.get(item.question_id) ?? []),
        item.name,
      ]);
    const pendingReview: EditorialReview = {
      provenance: "EDITORIAL",
      reviewedAt: "",
      answerLeakState: "PENDING",
    };
    return rows.map((row) => ({
      id: row.id,
      publicId: row.public_id,
      slug: row.slug,
      questionText: row.question_text,
      category: row.category_name,
      categorySlug: row.category_slug,
      tags: tags.get(row.id) ?? [],
      claimedStatus: row.claimed_status,
      verifiedStatus: row.verified_status,
      verificationState: row.verification_state,
      featured: Boolean(row.featured),
      contextSummary: summaries.get(row.id) ?? "",
      origins: "",
      evolution: "",
      whyAsked: "",
      whyItMatters: "",
      whereItAppears: "",
      timeline: [],
      references: [],
      storySections: [],
      people: [],
      keyTerms: [],
      branches: [],
      editorialReview: {
        SUMMARY: pendingReview,
        ORIGINS: pendingReview,
        EVOLUTION: pendingReview,
        WHY_ASKED: pendingReview,
        WHY_IT_MATTERS: pendingReview,
        WHERE_IT_APPEARS: pendingReview,
      },
    }));
  }

  private async hydrate(row: QuestionRow): Promise<PublicQuestion> {
    const [
      sectionsResult,
      timelineResult,
      refsResult,
      tagsResult,
      storyResult,
      paragraphResult,
      blockResult,
      peopleResult,
      termsResult,
      branchesResult,
      answerAttemptsResult,
      categoriesResult,
      statusEventsResult,
      phrasingsResult,
    ] = await Promise.all([
      this.db
        .prepare(
          "SELECT section_type, body, provenance, reviewed_at, answer_leak_state FROM question_content_sections WHERE question_id = ? AND publication_state = 'PUBLISHED' ORDER BY position",
        )
        .bind(row.id)
        .all<SectionRow>(),
      this.db
        .prepare(
          "SELECT display_date, title, description FROM timeline_events WHERE question_id = ? ORDER BY position",
        )
        .bind(row.id)
        .all<TimelineRow>(),
      this.db
        .prepare(
          "SELECT title, COALESCE(publisher,'') publisher, source_url, purpose FROM question_references WHERE question_id = ? ORDER BY position",
        )
        .bind(row.id)
        .all<ReferenceRow>(),
      this.db
        .prepare(
          "SELECT t.name FROM tags t JOIN question_tags qt ON qt.tag_id = t.id WHERE qt.question_id = ? ORDER BY t.name",
        )
        .bind(row.id)
        .all<TagRow>(),
      this.db
        .prepare(
          "SELECT id,section_key,kicker,title,provenance,answer_leak_state,COALESCE(reviewed_at,'') reviewed_at FROM question_story_sections WHERE question_id=? ORDER BY position",
        )
        .bind(row.id)
        .all<StoryRow>(),
      this.db
        .prepare(
          "SELECT p.section_id,p.body FROM question_story_paragraphs p JOIN question_story_sections s ON s.id=p.section_id WHERE s.question_id=? ORDER BY s.position,p.position",
        )
        .bind(row.id)
        .all<ParagraphRow>(),
      this.db
        .prepare(
          "SELECT b.section_id,b.block_type,b.data_json FROM question_story_blocks b JOIN question_story_sections s ON s.id=b.section_id WHERE s.question_id=? AND b.answer_leak_state='PASSED' ORDER BY s.position,b.position",
        )
        .bind(row.id)
        .all<BlockRow>(),
      this.db
        .prepare(
          "SELECT name,period,association FROM person_associations WHERE question_id=? ORDER BY position",
        )
        .bind(row.id)
        .all<PersonRow>(),
      this.db
        .prepare(
          "SELECT term,description FROM question_key_terms WHERE question_id=? ORDER BY position",
        )
        .bind(row.id)
        .all<TermRow>(),
      this.db
        .prepare(
          "SELECT question_text,relationship_type FROM question_branches WHERE question_id=? ORDER BY position",
        )
        .bind(row.id)
        .all<BranchRow>(),
      this.db
        .prepare(
          "SELECT title,author,publisher,source_url,publication_date,approach,scope,significance,unresolved,outcome_type,outcome_note FROM question_answer_attempts WHERE question_id=? AND verified=1 ORDER BY position",
        )
        .bind(row.id)
        .all<AnswerAttemptRow>(),
      this.db.prepare("SELECT c.name,c.slug,qc.is_primary FROM question_categories qc JOIN categories c ON c.id=qc.category_id WHERE qc.question_id=? ORDER BY qc.is_primary DESC,qc.position,c.name").bind(row.id).all<CategoryRow>(),
      this.db.prepare("SELECT occurred_at,from_status,to_status,evidence_url,verifier_type,verifier_name,note FROM question_status_events WHERE question_id=? ORDER BY occurred_at DESC,created_at DESC").bind(row.id).all<StatusEventRow>(),
      this.db.prepare("SELECT text,period,language,source_url,source_title,note FROM question_phrasings WHERE question_id=? AND verified=1 ORDER BY position,period").bind(row.id).all<PhrasingRow>(),
    ]);
    const sections = new Map(
      (sectionsResult.results ?? []).map((section) => [
        section.section_type,
        section,
      ]),
    );
    const body = (type: SectionRow["section_type"]) =>
      sections.get(type)?.body ?? "";
    const review = (type: SectionRow["section_type"]): EditorialReview => {
      const section = sections.get(type);
      return section
        ? {
            provenance: section.provenance,
            reviewedAt: section.reviewed_at,
            answerLeakState: section.answer_leak_state,
          }
        : {
            provenance: "EDITORIAL",
            reviewedAt: "",
            answerLeakState: "PENDING",
          };
    };
    return {
      id: row.id,
      publicId: row.public_id,
      slug: row.slug,
      questionText: row.question_text,
      category: row.category_name,
      categorySlug: row.category_slug,
      categories: (categoriesResult.results ?? []).map(item=>({name:item.name,slug:item.slug,primary:Boolean(item.is_primary)})),
      tags: (tagsResult.results ?? []).map((tag) => tag.name),
      claimedStatus: row.claimed_status,
      verifiedStatus: row.verified_status,
      verificationState: row.verification_state,
      statusHistory: (statusEventsResult.results ?? []).map(item=>({occurredAt:item.occurred_at,fromStatus:item.from_status,toStatus:item.to_status,evidenceUrl:item.evidence_url,verifierType:item.verifier_type,verifierName:item.verifier_name,note:item.note})),
      phrasings:(phrasingsResult.results??[]).map(item=>({text:item.text,period:item.period,language:item.language,sourceUrl:item.source_url,sourceTitle:item.source_title,note:item.note})),
      featured: Boolean(row.featured),
      contextSummary: body("SUMMARY"),
      origins: body("ORIGINS"),
      evolution: body("EVOLUTION"),
      whyAsked: body("WHY_ASKED"),
      whyItMatters: body("WHY_IT_MATTERS"),
      whereItAppears: body("WHERE_IT_APPEARS"),
      timeline: (timelineResult.results ?? []).map<TimelineEvent>((event) => ({
        year: event.display_date,
        title: event.title,
        description: event.description,
      })),
      references: (refsResult.results ?? []).map((ref) => ({
        title: ref.title,
        publisher: ref.publisher,
        url: ref.source_url,
        purpose: ref.purpose,
      })),
      answerAttempts: (answerAttemptsResult.results ?? []).map((attempt) => ({
        title: attempt.title,
        author: attempt.author,
        publisher: attempt.publisher,
        url: attempt.source_url,
        publicationDate: attempt.publication_date,
        approach: attempt.approach,
        scope: attempt.scope,
        significance: attempt.significance,
        unresolved: attempt.unresolved,
        outcomeType: attempt.outcome_type,
        outcomeNote: attempt.outcome_note,
      })),
      storySections: (storyResult.results ?? []).map((section) => ({
        id: section.section_key,
        kicker: section.kicker,
        title: section.title,
        paragraphs: (paragraphResult.results ?? [])
          .filter((paragraph) => paragraph.section_id === section.id)
          .map((paragraph) => paragraph.body),
        blocks: (blockResult.results ?? [])
          .filter((block) => block.section_id === section.id)
          .map(
            (block) =>
              ({
                type: block.block_type,
                ...JSON.parse(block.data_json),
              }) as StoryBlock,
          ),
        review: {
          provenance: section.provenance,
          answerLeakState: section.answer_leak_state,
          reviewedAt: section.reviewed_at,
        },
      })),
      people: peopleResult.results ?? [],
      keyTerms: termsResult.results ?? [],
      branches: (branchesResult.results ?? []).map((branch) => ({
        question: branch.question_text,
        relationship: branch.relationship_type,
      })),
      editorialReview: {
        SUMMARY: review("SUMMARY"),
        ORIGINS: review("ORIGINS"),
        EVOLUTION: review("EVOLUTION"),
        WHY_ASKED: review("WHY_ASKED"),
        WHY_IT_MATTERS: review("WHY_IT_MATTERS"),
        WHERE_IT_APPEARS: review("WHERE_IT_APPEARS"),
      },
    };
  }

  private async rows(
    where = "",
    bindings: unknown[] = [],
    limit?: number,
    offset = 0,
    sort: QuestionFilters["sort"] = "newest",
  ) {
    const order =
      sort === "recently-verified"
        ? "q.last_verified_at DESC,q.published_at DESC,q.id ASC"
        : sort === "most-connected"
          ? "(SELECT COUNT(*) FROM question_relationships r WHERE r.verified=1 AND (r.source_question_id=q.id OR r.target_question_id=q.id)) DESC,q.published_at DESC,q.id ASC"
          : "q.published_at DESC,q.created_at DESC,q.id ASC";
    const sql = `SELECT q.id,q.public_id,q.slug,q.question_text,COALESCE(c.name,q.category_name) category_name,COALESCE(c.slug,'uncategorised') category_slug,q.claimed_status,q.verified_status,q.verification_state,COALESCE(q.featured,0) featured FROM questions q LEFT JOIN categories c ON c.id=q.category_id WHERE q.publication_state='PUBLISHED' ${where} ORDER BY ${order}${limit ? ` LIMIT ${limit} OFFSET ${offset}` : ""}`;
    return (
      (
        await this.db
          .prepare(sql)
          .bind(...bindings)
          .all<QuestionRow>()
      ).results ?? []
    );
  }
  async list(filters: QuestionFilters = {}) {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (filters.status) {
      clauses.push("q.verified_status=?");
      values.push(filters.status);
    }
    if (filters.category) {
      clauses.push("EXISTS (SELECT 1 FROM question_categories qcf JOIN categories cf ON cf.id=qcf.category_id WHERE qcf.question_id=q.id AND cf.slug=?)");
      values.push(filters.category);
    }
    if (filters.tag) {
      clauses.push(
        "EXISTS (SELECT 1 FROM question_tags qtf JOIN tags tf ON tf.id=qtf.tag_id WHERE qtf.question_id=q.id AND tf.slug=?)",
      );
      values.push(filters.tag);
    }
    const pageSize = filters.pageSize;
    const offset = pageSize
      ? Math.max(0, ((filters.page ?? 1) - 1) * pageSize)
      : 0;
    const rows = await this.rows(
      clauses.length ? `AND ${clauses.join(" AND ")}` : "",
      values,
      pageSize,
      offset,
      filters.sort,
    );
    return this.summarize(rows);
  }
  async count(
    filters: Pick<QuestionFilters, "status" | "category" | "tag"> = {},
  ) {
    const clauses = ["q.publication_state='PUBLISHED'"];
    const values: unknown[] = [];
    if (filters.status) {
      clauses.push("q.verified_status=?");
      values.push(filters.status);
    }
    if (filters.category) {
      clauses.push("EXISTS (SELECT 1 FROM question_categories qcf JOIN categories cf ON cf.id=qcf.category_id WHERE qcf.question_id=q.id AND cf.slug=?)");
      values.push(filters.category);
    }
    if (filters.tag) {
      clauses.push(
        "EXISTS (SELECT 1 FROM question_tags qtf JOIN tags tf ON tf.id=qtf.tag_id WHERE qtf.question_id=q.id AND tf.slug=?)",
      );
      values.push(filters.tag);
    }
    const result = await this.db
      .prepare(
        `SELECT COUNT(*) count FROM questions q LEFT JOIN categories c ON c.id=q.category_id WHERE ${clauses.join(" AND ")}`,
      )
      .bind(...values)
      .first<{ count: number }>();
    return result?.count ?? 0;
  }
  async featured(limit = 6) {
    const rows = await this.rows("AND q.featured=1", [], limit);
    return this.summarize(rows);
  }
  async findBySlug(slug: string) {
    const rows = await this.rows("AND (q.slug=? OR EXISTS (SELECT 1 FROM question_slug_aliases a WHERE a.question_id=q.id AND a.slug=?))", [slug,slug], 1);
    return rows[0] ? this.hydrate(rows[0]) : null;
  }
  async search(query: string) {
    if (!query.trim()) return this.list();
    const terms = query.match(/[\p{L}\p{N}]+/gu) ?? [];
    if (!terms.length) return [];
    const ftsQuery = terms.map((term) => `"${term}"`).join(" AND ");
    const ids =
      (
        await this.db
          .prepare(
            "SELECT question_id FROM question_search WHERE question_search MATCH ? ORDER BY rank LIMIT 50",
          )
          .bind(ftsQuery)
          .all<{ question_id: string }>()
      ).results ?? [];
    if (!ids.length) return [];
    const placeholders = ids.map(() => "?").join(",");
    const rows = await this.rows(
      `AND q.id IN (${placeholders})`,
      ids.map((item) => item.question_id),
    );
    return this.summarize(rows);
  }
  async categories(): Promise<CategorySummary[]> {
    return (
      (
        await this.db
          .prepare(
            "SELECT c.slug,c.name,COALESCE(c.description,'') description,COUNT(q.id) count FROM categories c LEFT JOIN questions q ON q.category_id=c.id AND q.publication_state='PUBLISHED' GROUP BY c.id ORDER BY c.name",
          )
          .all<CategorySummary>()
      ).results ?? []
    );
  }
  async tags(): Promise<TagSummary[]> {
    return (
      (
        await this.db
          .prepare(
            "SELECT t.slug,t.name,COUNT(qt.question_id) count FROM tags t JOIN question_tags qt ON qt.tag_id=t.id JOIN questions q ON q.id=qt.question_id AND q.publication_state='PUBLISHED' GROUP BY t.id ORDER BY count DESC,t.name LIMIT 80",
          )
          .all<TagSummary>()
      ).results ?? []
    );
  }
  async related(slug: string) {
    const source = await this.findBySlug(slug);
    if (!source) return [];
    const edges =
      (
        await this.db
          .prepare(
            "SELECT source_slug AS sourceSlug,target_slug AS targetSlug,relationship_type AS type FROM question_relationships WHERE verified=1 AND (source_question_id=? OR target_question_id=?) ORDER BY confidence DESC,created_at DESC",
          )
          .bind(source.id, source.id)
          .all<{
            sourceSlug: string;
            targetSlug: string;
            type: import("@/domain/question").RelationshipType;
          }>()
      ).results ?? [];
    const related = await Promise.all(
      edges.map(async (edge) => ({
        edge,
        question: await this.findBySlug(
          edge.sourceSlug === slug ? edge.targetSlug : edge.sourceSlug,
        ),
      })),
    );
    return related.filter(
      (
        item,
      ): item is { edge: (typeof edges)[number]; question: PublicQuestion } =>
        Boolean(item.question),
    );
  }
  async graph(slug: string, depth: 1 | 2 = 2): Promise<QuestionGraph> {
    const nodes =
      (
        await this.db
          .prepare(
            `WITH RECURSIVE neighborhood(id,depth) AS (
      SELECT id,0 FROM questions WHERE slug=? AND publication_state='PUBLISHED'
      UNION
      SELECT CASE WHEN r.source_question_id=n.id THEN r.target_question_id ELSE r.source_question_id END,n.depth+1
      FROM neighborhood n JOIN question_relationships r ON r.verified=1 AND (r.source_question_id=n.id OR r.target_question_id=n.id)
      WHERE n.depth<?
    ), nearest AS (SELECT id,MIN(depth) depth FROM neighborhood GROUP BY id)
    SELECT q.id,q.slug,q.question_text questionText,COALESCE(c.name,q.category_name) category,
      q.verified_status status,nearest.depth,
      (SELECT COUNT(*) FROM question_relationships cr WHERE cr.verified=1 AND (cr.source_question_id=q.id OR cr.target_question_id=q.id)) connectionCount
    FROM nearest JOIN questions q ON q.id=nearest.id LEFT JOIN categories c ON c.id=q.category_id
    WHERE q.publication_state='PUBLISHED' ORDER BY nearest.depth,connectionCount DESC,q.question_text LIMIT 24`,
          )
          .bind(slug, depth)
          .all<QuestionGraphNode>()
      ).results ?? [];
    if (!nodes.length) return { centerSlug: slug, nodes: [], edges: [] };
    const slugs = nodes.map((node) => node.slug);
    const placeholders = slugs.map(() => "?").join(",");
    const edges =
      (
        await this.db
          .prepare(
            `SELECT source_slug sourceSlug,target_slug targetSlug,relationship_type type
      FROM question_relationships WHERE verified=1 AND source_slug IN (${placeholders}) AND target_slug IN (${placeholders})
      ORDER BY confidence DESC,created_at`,
          )
          .bind(...slugs, ...slugs)
          .all<QuestionGraph["edges"][number]>()
      ).results ?? [];
    return { centerSlug: slug, nodes, edges };
  }
  async createDraft(input: {
    questionText: string;
    claimedStatus: AnswerStatus;
    category: string;
    contextSummary: string;
  }) {
    const id = crypto.randomUUID();
    const publicId = `TQ-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
    const slug = slugifyQuestion(input.questionText);
    await this.db
      .prepare(
        "INSERT INTO questions (id,public_id,question_text,slug,publication_state,claimed_status,verification_state,category_name,context_summary,public_json) VALUES (?,?,?,?, 'DRAFT',?,'PENDING',?,?,'{}')",
      )
      .bind(
        id,
        publicId,
        input.questionText,
        slug,
        input.claimedStatus,
        input.category,
        input.contextSummary,
      )
      .run();
    await this.db.prepare("INSERT INTO question_slug_aliases(slug,question_id) VALUES (?,?)").bind(slug,id).run();
    await this.db
      .prepare(
        "INSERT INTO question_content_sections (id,question_id,section_type,body,provenance,publication_state,answer_leak_state,position) VALUES (?,?, 'SUMMARY',?,'PUBLISHER','DRAFT','PENDING',0)",
      )
      .bind(crypto.randomUUID(), id, input.contextSummary)
      .run();
    return { id, slug, publicationState: "DRAFT" as const };
  }
}
