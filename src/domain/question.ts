export const answerStatuses = [
  "ANSWERED",
  "PARTIALLY_ANSWERED",
  "OPEN",
] as const;
export type AnswerStatus = (typeof answerStatuses)[number];

export const verificationStates = [
  "PENDING",
  "VERIFIED",
  "UNCERTAIN",
  "CONTRADICTED",
  "STALE",
] as const;
export type VerificationState = (typeof verificationStates)[number];

export const relationshipTypes = [
  "RELATED_TO",
  "LEADS_TO",
  "DEPENDS_ON",
  "REFINES",
  "GENERALIZES",
  "CHALLENGES",
  "PRECEDES",
] as const;
export type RelationshipType = (typeof relationshipTypes)[number];

export type TimelineEvent = {
  year: string;
  title: string;
  description: string;
};
export type QuestionReference = {
  slug?: string;
  title: string;
  publisher: string;
  url: string;
  purpose:
    | "HISTORICAL_CONTEXT"
    | "STATUS_VERIFICATION"
    | "ORIGIN"
    | "TIMELINE"
    | "BACKGROUND";
};
export type QuestionCitation = { targetType:"STORY_SECTION"|"TIMELINE_EVENT"|"ANSWER_ATTEMPT"|"STATUS_EVENT"|"RELATIONSHIP"; targetId:string; sourceSlug:string; title:string; publisher:string; url:string; note:string };
export type EditorialReview = {
  provenance: "EDITORIAL" | "PUBLISHER" | "AI_ASSISTED";
  reviewedAt: string;
  answerLeakState: "PASSED" | "PENDING" | "REJECTED";
};
export type StoryBlock =
  | { type: "PARAGRAPH"; text: string }
  | { type: "HEADING"; text: string; level: 3 | 4 }
  | {
      type: "IMAGE";
      src: string;
      alt: string;
      caption?: string;
      credit?: string;
      sourceUrl?: string;
    }
  | { type: "TABLE"; caption?: string; headers: string[]; rows: string[][] }
  | { type: "LIST"; style: "ORDERED" | "UNORDERED"; items: string[] }
  | { type: "QUOTE"; text: string; attribution?: string; sourceUrl?: string }
  | {
      type: "CALLOUT";
      title?: string;
      text: string;
      tone: "NOTE" | "CONTEXT" | "CAUTION";
    };
export type StorySection = {
  id: string;
  kicker: string;
  title: string;
  paragraphs: string[];
  blocks?: StoryBlock[];
  review: EditorialReview;
};
export type PersonAssociation = {
  slug?: string;
  name: string;
  period: string;
  association: string;
};
export type KeyTerm = { slug?: string; term: string; description: string };
export type QuestionBranch = {
  question: string;
  relationship: RelationshipType;
};
export type AnswerAttempt = {
  id?: string;
  title: string;
  author: string;
  publisher: string;
  url: string;
  publicationDate: string;
  approach: string;
  scope: string;
  significance: string;
  unresolved: string;
  outcomeType?: "PARTIAL" | "DISPUTED" | "SUPERSEDED" | "ABANDONED" | "ONGOING";
  outcomeNote?: string;
};
export type QuestionPhrasing = { text:string; period:string; language:string; sourceUrl:string|null; sourceTitle:string|null; note:string|null };
export type QuestionCategory = { name: string; slug: string; primary: boolean };
export type QuestionStatusEvent = {
  id?: string;
  occurredAt: string;
  fromStatus: AnswerStatus | null;
  toStatus: AnswerStatus;
  evidenceUrl: string | null;
  verifierType: "MIGRATION" | "EDITORIAL" | "INSTITUTION" | "SYSTEM";
  verifierName: string | null;
  note: string | null;
};

export type PublicQuestion = {
  id: string;
  publicId?: string;
  slug: string;
  questionText: string;
  category: string;
  categorySlug: string;
  categories?: QuestionCategory[];
  tags: string[];
  claimedStatus: AnswerStatus;
  verifiedStatus: AnswerStatus;
  verificationState: VerificationState;
  statusHistory?: QuestionStatusEvent[];
  phrasings?: QuestionPhrasing[];
  contextSummary: string;
  origins: string;
  evolution: string;
  whyAsked: string;
  whyItMatters: string;
  whereItAppears: string;
  timeline: TimelineEvent[];
  references: QuestionReference[];
  citations?: QuestionCitation[];
  answerAttempts?: AnswerAttempt[];
  storySections: StorySection[];
  people: PersonAssociation[];
  keyTerms: KeyTerm[];
  branches: QuestionBranch[];
  editorialReview: Record<
    | "SUMMARY"
    | "ORIGINS"
    | "EVOLUTION"
    | "WHY_ASKED"
    | "WHY_IT_MATTERS"
    | "WHERE_IT_APPEARS",
    EditorialReview
  >;
  featured?: boolean;
};

export type QuestionRelationship = {
  sourceSlug: string;
  targetSlug: string;
  type: RelationshipType;
  confidence?: number;
  verified?: boolean;
  rationale?: string;
  evidenceUrl?: string;
  evidenceNote?: string;
};

export function isAnswerStatus(value: unknown): value is AnswerStatus {
  return (
    typeof value === "string" && answerStatuses.includes(value as AnswerStatus)
  );
}

export function isRelationshipType(value: unknown): value is RelationshipType {
  return (
    typeof value === "string" &&
    relationshipTypes.includes(value as RelationshipType)
  );
}

export function slugifyQuestion(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const forbiddenPublicKeys = /^(answer|answer_body|solution|accepted_answer)$/i;
export function sanitizePublicRecord<T extends Record<string, unknown>>(
  record: T,
): Omit<T, "answer"> {
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => !forbiddenPublicKeys.test(key)),
  ) as Omit<T, "answer">;
}

export function hasLikelyAnswerLeak(text: string): boolean {
  return /\b(the (?:definitive )?answer is|this proves that|therefore,? the answer|it is conclusively)\b/i.test(
    text,
  );
}
export function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}
