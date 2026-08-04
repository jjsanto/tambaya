import { categories, getQuestion, getRelated, questions, searchQuestions } from "./questions";
import type { QuestionFilters, QuestionRepository } from "./repository";

export class FixtureQuestionRepository implements QuestionRepository {
  async list(filters: QuestionFilters = {}) { return questions.filter(q => (!filters.status || q.verifiedStatus === filters.status) && (!filters.category || q.categorySlug === filters.category)); }
  async featured(limit = 6) { return questions.filter(q => q.featured).slice(0, limit); }
  async findBySlug(slug: string) { return getQuestion(slug) ?? null; }
  async search(query: string) { return searchQuestions(query); }
  async categories() { return categories; }
  async related(slug: string) { return getRelated(slug); }
  async createDraft(): Promise<never> { throw new Error("Draft persistence requires the D1 binding. Use the Cloudflare local preview."); }
}
