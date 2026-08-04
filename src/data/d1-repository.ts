import { slugifyQuestion, type AnswerStatus, type EditorialReview, type PublicQuestion, type QuestionReference, type RelationshipType, type StoryBlock, type TimelineEvent } from "@/domain/question";
import type { D1DatabaseLike } from "@/types/cloudflare";
import type { CategorySummary, QuestionFilters, QuestionRepository, QuestionRow } from "./repository";

type SectionRow = { section_type: keyof PublicQuestion["editorialReview"]; body: string; provenance: EditorialReview["provenance"]; reviewed_at: string; answer_leak_state: EditorialReview["answerLeakState"] };
type TimelineRow = { display_date: string; title: string; description: string };
type ReferenceRow = { title: string; publisher: string; source_url: string; purpose: QuestionReference["purpose"] };
type TagRow = { name: string };
type StoryRow = { id: string; section_key: string; kicker: string; title: string; provenance: EditorialReview["provenance"]; answer_leak_state: EditorialReview["answerLeakState"]; reviewed_at: string };
type ParagraphRow = { section_id: string; body: string };
type BlockRow = { section_id: string; block_type: StoryBlock["type"]; data_json: string };
type PersonRow = { name: string; period: string; association: string };
type TermRow = { term: string; description: string };
type BranchRow = { question_text: string; relationship_type: RelationshipType };

export class D1QuestionRepository implements QuestionRepository {
  constructor(private readonly db: D1DatabaseLike) {}

  private async hydrate(row: QuestionRow): Promise<PublicQuestion> {
    const [sectionsResult, timelineResult, refsResult, tagsResult, storyResult, paragraphResult, blockResult, peopleResult, termsResult, branchesResult] = await Promise.all([
      this.db.prepare("SELECT section_type, body, provenance, reviewed_at, answer_leak_state FROM question_content_sections WHERE question_id = ? AND publication_state = 'PUBLISHED' ORDER BY position").bind(row.id).all<SectionRow>(),
      this.db.prepare("SELECT display_date, title, description FROM timeline_events WHERE question_id = ? ORDER BY position").bind(row.id).all<TimelineRow>(),
      this.db.prepare("SELECT title, COALESCE(publisher,'') publisher, source_url, purpose FROM question_references WHERE question_id = ? ORDER BY position").bind(row.id).all<ReferenceRow>(),
      this.db.prepare("SELECT t.name FROM tags t JOIN question_tags qt ON qt.tag_id = t.id WHERE qt.question_id = ? ORDER BY t.name").bind(row.id).all<TagRow>(),
      this.db.prepare("SELECT id,section_key,kicker,title,provenance,answer_leak_state,COALESCE(reviewed_at,'') reviewed_at FROM question_story_sections WHERE question_id=? ORDER BY position").bind(row.id).all<StoryRow>(),
      this.db.prepare("SELECT p.section_id,p.body FROM question_story_paragraphs p JOIN question_story_sections s ON s.id=p.section_id WHERE s.question_id=? ORDER BY s.position,p.position").bind(row.id).all<ParagraphRow>(),
      this.db.prepare("SELECT b.section_id,b.block_type,b.data_json FROM question_story_blocks b JOIN question_story_sections s ON s.id=b.section_id WHERE s.question_id=? AND b.answer_leak_state='PASSED' ORDER BY s.position,b.position").bind(row.id).all<BlockRow>(),
      this.db.prepare("SELECT name,period,association FROM person_associations WHERE question_id=? ORDER BY position").bind(row.id).all<PersonRow>(),
      this.db.prepare("SELECT term,description FROM question_key_terms WHERE question_id=? ORDER BY position").bind(row.id).all<TermRow>(),
      this.db.prepare("SELECT question_text,relationship_type FROM question_branches WHERE question_id=? ORDER BY position").bind(row.id).all<BranchRow>(),
    ]);
    const sections = new Map((sectionsResult.results ?? []).map(section => [section.section_type, section]));
    const body = (type: SectionRow["section_type"]) => sections.get(type)?.body ?? "";
    const review = (type: SectionRow["section_type"]): EditorialReview => {
      const section = sections.get(type);
      return section ? { provenance: section.provenance, reviewedAt: section.reviewed_at, answerLeakState: section.answer_leak_state } : { provenance: "EDITORIAL", reviewedAt: "", answerLeakState: "PENDING" };
    };
    return {
      id: row.id, slug: row.slug, questionText: row.question_text, category: row.category_name, categorySlug: row.category_slug,
      tags: (tagsResult.results ?? []).map(tag => tag.name), claimedStatus: row.claimed_status, verifiedStatus: row.verified_status,
      verificationState: row.verification_state, featured: Boolean(row.featured), contextSummary: body("SUMMARY"), origins: body("ORIGINS"),
      evolution: body("EVOLUTION"), whyAsked: body("WHY_ASKED"), whyItMatters: body("WHY_IT_MATTERS"), whereItAppears: body("WHERE_IT_APPEARS"),
      timeline: (timelineResult.results ?? []).map<TimelineEvent>(event => ({ year: event.display_date, title: event.title, description: event.description })),
      references: (refsResult.results ?? []).map(ref => ({ title: ref.title, publisher: ref.publisher, url: ref.source_url, purpose: ref.purpose })),
      storySections: (storyResult.results ?? []).map(section => ({ id: section.section_key, kicker: section.kicker, title: section.title, paragraphs: (paragraphResult.results ?? []).filter(paragraph => paragraph.section_id === section.id).map(paragraph => paragraph.body), blocks: (blockResult.results ?? []).filter(block => block.section_id === section.id).map(block => ({ type: block.block_type, ...JSON.parse(block.data_json) }) as StoryBlock), review: { provenance: section.provenance, answerLeakState: section.answer_leak_state, reviewedAt: section.reviewed_at } })),
      people: peopleResult.results ?? [], keyTerms: termsResult.results ?? [], branches: (branchesResult.results ?? []).map(branch => ({ question: branch.question_text, relationship: branch.relationship_type })),
      editorialReview: { SUMMARY: review("SUMMARY"), ORIGINS: review("ORIGINS"), EVOLUTION: review("EVOLUTION"), WHY_ASKED: review("WHY_ASKED"), WHY_IT_MATTERS: review("WHY_IT_MATTERS"), WHERE_IT_APPEARS: review("WHERE_IT_APPEARS") },
    };
  }

  private async rows(where = "", bindings: unknown[] = [], limit?: number) {
    const sql = `SELECT q.id,q.slug,q.question_text,COALESCE(c.name,q.category_name) category_name,COALESCE(c.slug,'uncategorised') category_slug,q.claimed_status,q.verified_status,q.verification_state,COALESCE(q.featured,0) featured FROM questions q LEFT JOIN categories c ON c.id=q.category_id WHERE q.publication_state='PUBLISHED' ${where} ORDER BY q.featured DESC,q.published_at DESC${limit ? ` LIMIT ${limit}` : ""}`;
    return (await this.db.prepare(sql).bind(...bindings).all<QuestionRow>()).results ?? [];
  }
  async list(filters: QuestionFilters = {}) { const clauses: string[] = []; const values: unknown[] = []; if (filters.status) { clauses.push("q.verified_status=?"); values.push(filters.status); } if (filters.category) { clauses.push("c.slug=?"); values.push(filters.category); } const rows = await this.rows(clauses.length ? `AND ${clauses.join(" AND ")}` : "", values); return Promise.all(rows.map(row => this.hydrate(row))); }
  async featured(limit = 6) { const rows = await this.rows("AND q.featured=1", [], limit); return Promise.all(rows.map(row => this.hydrate(row))); }
  async findBySlug(slug: string) { const rows = await this.rows("AND q.slug=?", [slug], 1); return rows[0] ? this.hydrate(rows[0]) : null; }
  async search(query: string) { if (!query.trim()) return this.list(); const ids = (await this.db.prepare("SELECT question_id FROM question_search WHERE question_search MATCH ? ORDER BY rank LIMIT 50").bind(query.replace(/[\"']/g, " ")).all<{question_id:string}>()).results ?? []; if (!ids.length) return []; const placeholders = ids.map(() => "?").join(","); const rows = await this.rows(`AND q.id IN (${placeholders})`, ids.map(item => item.question_id)); return Promise.all(rows.map(row => this.hydrate(row))); }
  async categories(): Promise<CategorySummary[]> { return (await this.db.prepare("SELECT c.slug,c.name,COUNT(q.id) count FROM categories c LEFT JOIN questions q ON q.category_id=c.id AND q.publication_state='PUBLISHED' GROUP BY c.id ORDER BY c.name").all<CategorySummary>()).results ?? []; }
  async related(slug: string) { const source = await this.findBySlug(slug); if (!source) return []; const edges = (await this.db.prepare("SELECT source_slug AS sourceSlug,target_slug AS targetSlug,relationship_type AS type FROM question_relationships WHERE source_question_id=? OR target_question_id=?").bind(source.id,source.id).all<{sourceSlug:string;targetSlug:string;type:import("@/domain/question").RelationshipType}>()).results ?? []; return Promise.all(edges.map(async edge => ({ edge, question: (await this.findBySlug(edge.sourceSlug === slug ? edge.targetSlug : edge.sourceSlug))! }))); }
  async createDraft(input: { questionText: string; claimedStatus: AnswerStatus; category: string; contextSummary: string }) { const id = crypto.randomUUID(); const slug = slugifyQuestion(input.questionText); await this.db.prepare("INSERT INTO questions (id,question_text,slug,publication_state,claimed_status,verification_state,category_name,context_summary,public_json) VALUES (?,?,?,'DRAFT',?,'PENDING',?,?,'{}')").bind(id,input.questionText,slug,input.claimedStatus,input.category,input.contextSummary).run(); await this.db.prepare("INSERT INTO question_content_sections (id,question_id,section_type,body,provenance,publication_state,answer_leak_state,position) VALUES (?,?, 'SUMMARY',?,'PUBLISHER','DRAFT','PENDING',0)").bind(crypto.randomUUID(),id,input.contextSummary).run(); return { id, slug, publicationState: "DRAFT" as const }; }
}
