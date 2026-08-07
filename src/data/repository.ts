import type {
  AnswerStatus,
  PublicQuestion,
  QuestionRelationship,
  RelationshipType,
  VerificationState,
} from "@/domain/question";

export type QuestionSort = "newest" | "recently-verified" | "most-connected";
export type QuestionFilters = {
  status?: string;
  category?: string;
  tag?: string;
  sort?: QuestionSort;
  page?: number;
  pageSize?: number;
};
export type CategorySummary = {
  slug: string;
  name: string;
  count: number;
  description?: string;
};
export type TagSummary = { slug: string; name: string; count: number };
export type RelatedQuestion = {
  edge: QuestionRelationship;
  question: PublicQuestion;
};
export type QuestionGraphNode = {
  id: string;
  slug: string;
  questionText: string;
  category: string;
  status: AnswerStatus;
  depth: number;
  connectionCount: number;
};
export type QuestionGraphEdge = {
  sourceSlug: string;
  targetSlug: string;
  type: RelationshipType;
};
export type QuestionGraph = {
  centerSlug: string;
  nodes: QuestionGraphNode[];
  edges: QuestionGraphEdge[];
};

export interface QuestionRepository {
  list(filters?: QuestionFilters): Promise<PublicQuestion[]>;
  count(
    filters?: Pick<QuestionFilters, "status" | "category" | "tag">,
  ): Promise<number>;
  featured(limit?: number): Promise<PublicQuestion[]>;
  findBySlug(slug: string): Promise<PublicQuestion | null>;
  search(query: string): Promise<PublicQuestion[]>;
  categories(): Promise<CategorySummary[]>;
  tags(): Promise<TagSummary[]>;
  related(slug: string): Promise<RelatedQuestion[]>;
  graph(slug: string, depth?: 1 | 2): Promise<QuestionGraph>;
  createDraft(input: {
    questionText: string;
    claimedStatus: AnswerStatus;
    category: string;
    contextSummary: string;
  }): Promise<{ id: string; slug: string; publicationState: "DRAFT" }>;
}

export type QuestionRow = {
  id: string;
  slug: string;
  question_text: string;
  category_name: string;
  category_slug: string;
  claimed_status: AnswerStatus;
  verified_status: AnswerStatus;
  verification_state: VerificationState;
  featured: number;
};
