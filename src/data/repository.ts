import type { AnswerStatus, PublicQuestion, QuestionRelationship, VerificationState } from "@/domain/question";

export type QuestionFilters = { status?: string; category?: string };
export type CategorySummary = { slug: string; name: string; count: number };
export type RelatedQuestion = { edge: QuestionRelationship; question: PublicQuestion };

export interface QuestionRepository {
  list(filters?: QuestionFilters): Promise<PublicQuestion[]>;
  featured(limit?: number): Promise<PublicQuestion[]>;
  findBySlug(slug: string): Promise<PublicQuestion | null>;
  search(query: string): Promise<PublicQuestion[]>;
  categories(): Promise<CategorySummary[]>;
  related(slug: string): Promise<RelatedQuestion[]>;
  createDraft(input: { questionText: string; claimedStatus: AnswerStatus; category: string; contextSummary: string }): Promise<{ id: string; slug: string; publicationState: "DRAFT" }>;
}

export type QuestionRow = {
  id: string; slug: string; question_text: string; category_name: string; category_slug: string;
  claimed_status: AnswerStatus; verified_status: AnswerStatus; verification_state: VerificationState; featured: number;
};
