import { categories, getQuestion, getRelated, questions, relationships, searchQuestions } from "./questions";
import type { QuestionFilters, QuestionRepository } from "./repository";

export class FixtureQuestionRepository implements QuestionRepository {
  async list(filters: QuestionFilters = {}) { const matches = questions.filter(q => (!filters.status || q.verifiedStatus === filters.status) && (!filters.category || q.categorySlug === filters.category) && (!filters.tag || q.tags.some(tag => tag.toLowerCase().replaceAll(" ", "-") === filters.tag))); if (filters.sort === "newest" || filters.sort === "recently-verified") matches.reverse(); if (filters.sort === "most-connected") matches.sort((a,b) => relationships.filter(edge => edge.sourceSlug === b.slug || edge.targetSlug === b.slug).length - relationships.filter(edge => edge.sourceSlug === a.slug || edge.targetSlug === a.slug).length); const pageSize = filters.pageSize ?? matches.length; const offset = Math.max(0, ((filters.page ?? 1) - 1) * pageSize); return matches.slice(offset, offset + pageSize); }
  async count(filters: Pick<QuestionFilters, "status" | "category" | "tag"> = {}) { return questions.filter(q => (!filters.status || q.verifiedStatus === filters.status) && (!filters.category || q.categorySlug === filters.category) && (!filters.tag || q.tags.some(tag => tag.toLowerCase().replaceAll(" ", "-") === filters.tag))).length; }
  async featured(limit = 6) { return questions.filter(q => q.featured).slice(0, limit); }
  async findBySlug(slug: string) { return getQuestion(slug) ?? null; }
  async search(query: string) { return searchQuestions(query); }
  async categories() { return categories; }
  async tags() { const names = [...new Set(questions.flatMap(question => question.tags))]; return names.map(name => ({ name, slug: name.toLowerCase().replaceAll(" ", "-"), count: questions.filter(question => question.tags.includes(name)).length })).sort((a,b) => b.count - a.count || a.name.localeCompare(b.name)); }
  async related(slug: string) { return getRelated(slug); }
  async createDraft(): Promise<never> { throw new Error("Draft persistence requires the D1 binding. Use the Cloudflare local preview."); }
}
