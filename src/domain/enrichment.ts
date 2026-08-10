import {
  answerStatuses,
  countWords,
  hasLikelyAnswerLeak,
  isRelationshipType,
  type AnswerStatus,
  type RelationshipType,
  type StoryBlock,
} from "@/domain/question";

export type EnrichmentSection = {
  key: string;
  kicker: string;
  title: string;
  paragraphs: string[];
  blocks: StoryBlock[];
};
export type EnrichmentProposal = {
  contextSummary: string;
  timeline: {
    displayDate: string;
    title: string;
    description: string;
  }[];
  sections: EnrichmentSection[];
  suggestedStatus: AnswerStatus;
  statusConfidence: "LOW" | "MEDIUM" | "HIGH";
  statusRationale: string;
  sourceLeads: {
    title: string;
    publisher: string;
    url: string;
    purpose: string;
  }[];
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
  warnings: string[];
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}
function safeUrl(value: unknown) {
  const url = clean(value);
  return /^https:\/\//i.test(url) ? url : "";
}

export function parseEnrichmentProposal(value: unknown): EnrichmentProposal {
  const candidate = value as Record<string, unknown>;
  const contextSummary = clean(candidate.contextSummary);
  if (
    contextSummary.length < 150 ||
    countWords(contextSummary) > 60 ||
    hasLikelyAnswerLeak(contextSummary)
  )
    throw new Error(
      "AI context summary is too short or may answer the question.",
    );
  if (
    !candidate ||
    !Array.isArray(candidate.sections) ||
    candidate.sections.length < 3 ||
    candidate.sections.length > 10
  )
    throw new Error("AI returned an invalid number of Story sections.");
  const warnings: string[] = [];
  if (
    !Array.isArray(candidate.timeline) ||
    candidate.timeline.length < 3 ||
    candidate.timeline.length > 8
  )
    throw new Error("AI returned an invalid question-history timeline.");
  const timeline = candidate.timeline.map((raw, index) => {
    const event = raw as Record<string, unknown>;
    const displayDate = clean(event.displayDate);
    const title = clean(event.title);
    const description = clean(event.description);
    if (
      !displayDate ||
      title.length < 4 ||
      description.length < 60 ||
      hasLikelyAnswerLeak(description)
    )
      throw new Error(
        `AI timeline event ${index + 1} is incomplete or unsafe.`,
      );
    return { displayDate, title, description };
  });
  const sections = candidate.sections.map((raw, index) => {
    const section = raw as Record<string, unknown>;
    const paragraph = clean(section.paragraph);
    const kicker = clean(section.kicker);
    const title = clean(section.title);
    if (!kicker || title.length < 4 || paragraph.length < 80)
      throw new Error(`AI Story section ${index + 1} is incomplete.`);
    if (hasLikelyAnswerLeak(paragraph))
      throw new Error(
        `AI Story section ${index + 1} may answer the question and was rejected.`,
      );
    const listItems = Array.isArray(section.listItems)
      ? section.listItems.map(clean).filter(Boolean)
      : [];
    if (listItems.some(hasLikelyAnswerLeak))
      throw new Error(
        `AI Story section ${index + 1} contains an unsafe list and was rejected.`,
      );
    const blocks: StoryBlock[] = [{ type: "PARAGRAPH", text: paragraph }];
    if (listItems.length)
      blocks.push({ type: "LIST", style: "UNORDERED", items: listItems });
    const callout = clean(section.callout);
    if (callout) {
      if (hasLikelyAnswerLeak(callout))
        throw new Error(
          `AI Story section ${index + 1} contains an unsafe callout and was rejected.`,
        );
      blocks.push({
        type: "CALLOUT",
        tone: "CONTEXT",
        title: "Editorial context",
        text: callout,
      });
    }
    return {
      key:
        clean(section.key)
          .replace(/[^a-z0-9-]/gi, "-")
          .toLowerCase() || `section-${index + 1}`,
      kicker,
      title,
      paragraphs: [paragraph],
      blocks,
    };
  });
  const suggestedStatus = clean(candidate.suggestedStatus);
  if (!answerStatuses.includes(suggestedStatus as AnswerStatus))
    throw new Error("AI returned an invalid status suggestion.");
  const rationale = clean(candidate.statusRationale);
  if (!rationale || hasLikelyAnswerLeak(rationale))
    throw new Error("AI status rationale failed the answer-leak policy.");
  const confidence = clean(candidate.statusConfidence);
  const sourceLeads = (
    Array.isArray(candidate.sourceLeads) ? candidate.sourceLeads : []
  )
    .slice(0, 8)
    .flatMap((raw) => {
      const source = raw as Record<string, unknown>;
      const url = safeUrl(source.url);
      const title = clean(source.title);
      const publisher = clean(source.publisher);
      if (!url || !title || !publisher) {
        warnings.push("One incomplete source lead was omitted.");
        return [];
      }
      return [
        {
          title,
          publisher,
          url,
          purpose: clean(source.purpose) || "BACKGROUND",
        },
      ];
    });
  const answerAttempts = (
    Array.isArray(candidate.answerAttempts) ? candidate.answerAttempts : []
  )
    .slice(0, 10)
    .flatMap((raw) => {
      const attempt = raw as Record<string, unknown>;
      const url = safeUrl(attempt.url);
      const title = clean(attempt.title);
      const approach = clean(attempt.approach);
      const scope = clean(attempt.scope);
      const significance = clean(attempt.significance);
      const unresolved = clean(attempt.unresolved);
      if (
        !title ||
        approach.length < 30 ||
        scope.length < 30 ||
        significance.length < 30 ||
        unresolved.length < 30 ||
        [approach, scope, significance, unresolved].some(hasLikelyAnswerLeak)
      ) {
        warnings.push("One incomplete or unsafe answer attempt was omitted.");
        return [];
      }
      if (!url)
        warnings.push(
          `“${title}” needs an editor-verified HTTPS source before approval.`,
        );
      return [
        {
          title,
          author: clean(attempt.author),
          publisher: clean(attempt.publisher),
          url,
          publicationDate: clean(attempt.publicationDate),
          approach,
          scope,
          significance,
          unresolved,
        },
      ];
    });
  const relationships = (
    Array.isArray(candidate.relationships) ? candidate.relationships : []
  )
    .slice(0, 8)
    .flatMap((raw) => {
      const item = raw as Record<string, unknown>;
      const targetId = clean(item.targetId);
      const targetSlug = clean(item.targetSlug);
      const targetQuestion = clean(item.targetQuestion);
      const type = clean(item.type);
      const rationale = clean(item.rationale);
      const confidence = Number(item.confidence);
      if (
        !targetId ||
        !targetSlug ||
        !targetQuestion ||
        !isRelationshipType(type) ||
        !rationale ||
        !Number.isFinite(confidence) ||
        confidence < 0 ||
        confidence > 1
      ) {
        warnings.push("One invalid relationship suggestion was omitted.");
        return [];
      }
      return [
        { targetId, targetSlug, targetQuestion, type, confidence, rationale },
      ];
    });
  warnings.push(
    "AI output is a proposal. An editor must verify every factual claim and source before publication.",
  );
  return {
    contextSummary,
    timeline,
    sections,
    suggestedStatus: suggestedStatus as AnswerStatus,
    statusConfidence: ["LOW", "MEDIUM", "HIGH"].includes(confidence)
      ? (confidence as "LOW" | "MEDIUM" | "HIGH")
      : "LOW",
    statusRationale: rationale,
    sourceLeads,
    answerAttempts,
    relationships,
    warnings,
  };
}
