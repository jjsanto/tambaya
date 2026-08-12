import {
  hasLikelyAnswerLeak,
  isAnswerStatus,
  isRelationshipType,
  type AnswerStatus,
  type RelationshipType,
  type StoryBlock,
} from "@/domain/question";

export const QUESTION_SPEC_PROTOCOL = "tambaya.question-specification";
export const QUESTION_SPEC_VERSION = 1;
export const MAX_QUESTION_SPEC_BYTES = 1_000_000;

export type ImportableQuestionSpecification = {
  contextSummary: string;
  categoryId: string;
  verifiedStatus: AnswerStatus;
  sections: {
    key: string;
    kicker: string;
    title: string;
    paragraphs: string[];
    blocks?: StoryBlock[];
  }[];
  timeline: { displayDate: string; title: string; description: string }[];
  keyTerms: { term: string; description: string }[];
  people: { name: string; period: string; association: string }[];
  answerAttempts: {
    title: string;
    author: string;
    publisher: string;
    url: string;
    publicationDate: string;
    approach: string;
    scope: string;
    significance: string;
    unresolved: string;
  }[];
  relationships: {
    targetId: string;
    targetSlug: string;
    targetQuestion: string;
    type: RelationshipType;
    confidence: number;
    rationale: string;
  }[];
};

type AgentBriefInput = {
  questionId: string;
  questionTitle: string;
  currentSpecification: ImportableQuestionSpecification;
  categories: { id: string; name: string }[];
  relationshipCandidates: {
    id: string;
    slug: string;
    questionText: string;
    category: string;
    categoryId: string;
  }[];
};

export const RELATIONSHIP_TYPE_GUIDE = [
  {
    type: "RELATED_TO",
    meaning: "The questions address closely connected subjects without a stronger directional dependency.",
  },
  {
    type: "LEADS_TO",
    meaning: "Investigating the source question naturally raises the target question next.",
  },
  {
    type: "DEPENDS_ON",
    meaning: "Framing or investigating the source question relies on the target question.",
  },
  {
    type: "REFINES",
    meaning: "The source question narrows or makes the target question more precise.",
  },
  {
    type: "GENERALIZES",
    meaning: "The source question broadens the target question to a wider scope.",
  },
  {
    type: "CHALLENGES",
    meaning: "The source question disputes an assumption or framing embedded in the target question.",
  },
  {
    type: "PRECEDES",
    meaning: "The source question historically or logically comes before the target question.",
  },
] as const;

export function buildQuestionAgentBrief(input: AgentBriefInput) {
  return {
    protocol: QUESTION_SPEC_PROTOCOL,
    version: QUESTION_SPEC_VERSION,
    task: "Produce an improved, encyclopedic Tambaya question specification as JSON.",
    question: { id: input.questionId, title: input.questionTitle },
    editorialRules: [
      "Explain the question, its history, vocabulary, importance, and prior attempts; never answer or resolve it.",
      "Keep contextSummary between 150 characters and 60 words.",
      "Provide 5–10 substantial Story sections with answer-free paragraphs of at least 80 characters.",
      "Provide 3–8 historical timeline events with descriptions of at least 60 characters.",
      "Key terms are optional; include only question-specific definitions of at least 80 characters.",
      "Include people only when their documented work materially shaped this exact question; provide a period and a specific answer-free association.",
      "Use only credible HTTPS URLs. Sources and relationship proposals require later human approval.",
      "Suggest connections by comparing this question with the complete sameCategoryQuestions list. Use only supplied target IDs and supported relationship types.",
      "Return JSON only, without Markdown fences or commentary.",
    ],
    allowedCategories: input.categories,
    connectionGuidance: {
      supportedTypes: RELATIONSHIP_TYPE_GUIDE,
      sameCategoryQuestions: input.relationshipCandidates,
      instruction:
        "Propose only meaningful connections. Use targetId, targetSlug, and targetQuestion exactly as supplied, choose the most specific supported type, score confidence from 0 to 1, and explain the rationale.",
    },
    currentSpecification: input.currentSpecification,
    responseContract: {
      protocol: QUESTION_SPEC_PROTOCOL,
      version: QUESTION_SPEC_VERSION,
      questionId: input.questionId,
      specification: {
        contextSummary: "string",
        categoryId: "allowed category id",
        verifiedStatus: "OPEN | PARTIALLY_ANSWERED | ANSWERED",
        sections:
          "array of {key,kicker,title,paragraphs:string[],blocks?:StoryBlock[]}",
        timeline: "array of {displayDate,title,description}",
        keyTerms: "array of {term,description}; may be empty",
        people: "array of {name,period,association}; may be empty",
        answerAttempts:
          "array of {title,author,publisher,url,publicationDate,approach,scope,significance,unresolved}",
        relationships:
          "array of {targetId,targetSlug,targetQuestion,type,confidence,rationale}",
      },
    },
  };
}

function record(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be a JSON object.`);
  return value as Record<string, unknown>;
}
function text(value: unknown) {
  return String(value ?? "").trim();
}
function array(value: unknown, label: string, max: number) {
  if (!Array.isArray(value) || value.length > max)
    throw new Error(`${label} must be an array with at most ${max} items.`);
  return value;
}
function firstDefined(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (source[key] !== undefined) return source[key];
  }
  return undefined;
}
function blocks(value: unknown): StoryBlock[] | undefined {
  if (value === undefined) return undefined;
  const items = array(value, "Story blocks", 40);
  for (const raw of items) {
    const item = record(raw, "Story block");
    if (
      !["PARAGRAPH", "HEADING", "IMAGE", "TABLE", "LIST", "QUOTE", "CALLOUT"].includes(
        text(item.type),
      )
    )
      throw new Error("The imported specification contains an unsupported Story block.");
  }
  return items as StoryBlock[];
}

export function parseQuestionSpecification(
  raw: string,
  constraints: {
    questionId: string;
    categoryIds: Set<string>;
    relationshipTargets: Map<string, { slug: string; questionText: string }>;
  },
): ImportableQuestionSpecification {
  if (!raw.trim() || new TextEncoder().encode(raw).length > MAX_QUESTION_SPEC_BYTES)
    throw new Error("The imported JSON is empty or larger than 1 MB.");
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("The imported response is not valid JSON.");
  }
  const root = record(parsed, "Imported response");
  if (
    root.protocol !== undefined &&
    text(root.protocol) !== QUESTION_SPEC_PROTOCOL
  )
    throw new Error("The response uses an unsupported specification protocol.");
  if (
    root.version !== undefined &&
    Number(root.version) !== QUESTION_SPEC_VERSION
  )
    throw new Error("The response uses an unsupported specification version.");
  if (root.questionId !== undefined && text(root.questionId) !== constraints.questionId)
    throw new Error("This specification was generated for a different question.");
  const candidate = record(root.specification ?? root, "Question specification");
  const contextSummary = text(candidate.contextSummary);
  const categoryId = text(candidate.categoryId);
  const verifiedStatus = candidate.verifiedStatus;
  if (contextSummary.length < 150 || hasLikelyAnswerLeak(contextSummary))
    throw new Error("The imported context summary is too short or may answer the question.");
  if (!constraints.categoryIds.has(categoryId))
    throw new Error("The imported specification uses an unavailable category.");
  if (!isAnswerStatus(verifiedStatus))
    throw new Error("The imported specification has an invalid answer status.");

  const sections = array(candidate.sections, "Story sections", 20).map(
    (rawSection, index) => {
      const section = record(rawSection, `Story section ${index + 1}`);
      const paragraphs = array(
        section.paragraphs,
        `Story section ${index + 1} paragraphs`,
        20,
      ).map(text).filter(Boolean);
      if (
        text(section.kicker).length < 1 ||
        text(section.title).length < 4 ||
        !paragraphs.length
      )
        throw new Error(`Story section ${index + 1} is incomplete.`);
      return {
        key:
          text(section.key)
            .replace(/[^a-z0-9-]/gi, "-")
            .toLowerCase() || `section-${index + 1}`,
        kicker: text(section.kicker),
        title: text(section.title),
        paragraphs,
        blocks: blocks(section.blocks),
      };
    },
  );
  const timeline = array(candidate.timeline, "Timeline", 12).map((rawEvent) => {
    const event = record(rawEvent, "Timeline event");
    return {
      displayDate: text(event.displayDate),
      title: text(event.title),
      description: text(event.description),
    };
  });
  const keyTerms = array(
    firstDefined(candidate, ["keyTerms", "key_terms", "terms"]) ?? [],
    "Key terms",
    8,
  ).map((rawTerm, index) => {
    const term = record(rawTerm, `Key term ${index + 1}`);
    const name = text(firstDefined(term, ["term", "name", "title"]));
    const directDescription = firstDefined(term, [
      "description",
      "definition",
      "meaning",
    ]);
    const paragraphDescription = Array.isArray(term.paragraphs)
      ? term.paragraphs.map(text).filter(Boolean).join("\n\n")
      : "";
    const description = text(directDescription ?? paragraphDescription);
    if (!name || !description)
      throw new Error(
        `Key term ${index + 1} needs both a term and a description.`,
      );
    return { term: name, description };
  });
  const people = array(candidate.people ?? [], "People", 12).map((rawPerson) => {
    const person = record(rawPerson, "Person");
    return {
      name: text(person.name),
      period: text(person.period),
      association: text(person.association),
    };
  });
  const answerAttempts = array(
    candidate.answerAttempts ?? [],
    "Answer attempts",
    10,
  ).map((rawAttempt) => {
    const attempt = record(rawAttempt, "Answer attempt");
    return {
      title: text(attempt.title),
      author: text(attempt.author),
      publisher: text(attempt.publisher),
      url: text(attempt.url),
      publicationDate: text(attempt.publicationDate),
      approach: text(attempt.approach),
      scope: text(attempt.scope),
      significance: text(attempt.significance),
      unresolved: text(attempt.unresolved),
    };
  });
  const relationships = array(
    candidate.relationships ?? [],
    "Relationships",
    8,
  ).map((rawRelationship) => {
    const relationship = record(rawRelationship, "Relationship");
    const targetId = text(relationship.targetId);
    const target = constraints.relationshipTargets.get(targetId);
    const confidence = Number(relationship.confidence);
    if (
      !target ||
      text(relationship.targetSlug) !== target.slug ||
      !isRelationshipType(relationship.type) ||
      !Number.isFinite(confidence) ||
      confidence < 0 ||
      confidence > 1
    )
      throw new Error("The imported specification contains an invalid relationship.");
    return {
      targetId,
      targetSlug: target.slug,
      targetQuestion: target.questionText,
      type: relationship.type,
      confidence,
      rationale: text(relationship.rationale),
    };
  });
  return {
    contextSummary,
    categoryId,
    verifiedStatus,
    sections,
    timeline,
    keyTerms,
    people,
    answerAttempts,
    relationships,
  };
}
