"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  countWords,
  type AnswerStatus,
  type StoryBlock,
} from "@/domain/question";
import type { EnrichmentProposal } from "@/domain/enrichment";
import { evaluateEditorialQuality } from "@/domain/editorial-quality";
import {
  buildQuestionAgentBrief,
  type ImportableQuestionSpecification,
  MAX_QUESTION_SPEC_BYTES,
  parseQuestionSpecification,
} from "@/domain/question-exchange";
import { StoryBlocks } from "@/components/story-blocks";

type EditorialQuestion = {
  id: string;
  slug: string;
  question_text: string;
  publication_state: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  claimed_status: string;
  verified_status: string | null;
  verification_state: string;
  category_name: string;
  context_summary: string;
  updated_at: string;
  section_count: number;
  timeline_count: number;
  term_count: number;
  source_count: number;
  reference_count?: number;
  relationship_count: number;
  submission_state: string | null;
  review_notes: string | null;
};
type StoryEditorSection = {
  key: string;
  kicker: string;
  title: string;
  paragraphs: string[];
  blocks?: StoryBlock[];
};
type TimelineEditorEvent = {
  displayDate: string;
  title: string;
  description: string;
};
type KeyTermEditorItem = { term: string; description: string };
type PersonEditorItem = { name: string; period: string; association: string };
type AnswerAttemptEditorItem = EnrichmentProposal["answerAttempts"][number] & {
  approved: boolean;
};
type EditorialDetail = EditorialQuestion & {
  category_id: string;
  categories: { id: string; name: string }[];
  sections: StoryEditorSection[];
  timeline: TimelineEditorEvent[];
  keyTerms: KeyTermEditorItem[];
  people: PersonEditorItem[];
  answerAttempts: EnrichmentProposal["answerAttempts"];
  liveSections: StoryEditorSection[];
  hasPendingRevision: boolean;
  revisionDraftUpdatedAt: string | null;
  revisions: { id: string; action: string; created_at: string }[];
  relationships: (EnrichmentProposal["relationships"][number] & {
    verified: number;
  })[];
  candidates: {
    id: string;
    slug: string;
    questionText: string;
    category: string;
    categoryId: string;
  }[];
};

const labels: Record<string, string> = {
  OPEN: "Open",
  PARTIALLY_ANSWERED: "Partially answered",
  ANSWERED: "Answered",
};
const relationshipLabels: Record<string, string> = {
  RELATED_TO: "is related to",
  LEADS_TO: "leads to",
  DEPENDS_ON: "depends on",
  REFINES: "refines",
  GENERALIZES: "generalizes",
  CHALLENGES: "challenges",
  PRECEDES: "precedes",
};

function batchLabel(question: EditorialQuestion) {
  if (question.id.startsWith("pilot-2026-")) return "Pilot 25";
  if (question.id.startsWith("reviewed-batch-1-")) return "Reviewed batch 1";
  return question.submission_state ? "User submissions" : "Existing catalogue";
}

function qualityChecks(question: EditorialQuestion) {
  return [
    { key: "summary", label: "Summary", pass: question.context_summary.length >= 150 && countWords(question.context_summary) <= 60 },
    { key: "story", label: "Story", pass: question.section_count >= 5 },
    { key: "timeline", label: "Timeline", pass: question.timeline_count >= 3 },
    { key: "terms", label: question.term_count ? "Terms" : "Terms optional", pass: true },
    { key: "sources", label: "Sources", pass: question.source_count >= 1 },
    { key: "connections", label: question.relationship_count ? "Connections" : "Connections optional", pass: true },
  ];
}

function RichBlockFields({
  block,
  onChange,
  onRemove,
}: {
  block: StoryBlock;
  onChange: (block: StoryBlock) => void;
  onRemove: () => void;
}) {
  return (
    <article className="block-editor">
      <header>
        <strong>{block.type.toLowerCase()}</strong>
        <button type="button" onClick={onRemove}>
          Remove
        </button>
      </header>
      {block.type === "HEADING" && (
        <>
          <label>
            Heading
            <input
              value={block.text}
              onChange={(event) =>
                onChange({ ...block, text: event.target.value })
              }
            />
          </label>
          <label>
            Level
            <select
              value={block.level}
              onChange={(event) =>
                onChange({
                  ...block,
                  level: Number(event.target.value) as 3 | 4,
                })
              }
            >
              <option value="3">Heading 3</option>
              <option value="4">Heading 4</option>
            </select>
          </label>
        </>
      )}
      {block.type === "IMAGE" && (
        <>
          <label>
            HTTPS image URL
            <input
              value={block.src}
              onChange={(event) =>
                onChange({ ...block, src: event.target.value })
              }
            />
          </label>
          <label>
            Alternative text
            <input
              value={block.alt}
              onChange={(event) =>
                onChange({ ...block, alt: event.target.value })
              }
            />
          </label>
          <label>
            Caption
            <input
              value={block.caption ?? ""}
              onChange={(event) =>
                onChange({ ...block, caption: event.target.value })
              }
            />
          </label>
          <label>
            Credit
            <input
              value={block.credit ?? ""}
              onChange={(event) =>
                onChange({ ...block, credit: event.target.value })
              }
            />
          </label>
          <label>
            Source URL
            <input
              value={block.sourceUrl ?? ""}
              onChange={(event) =>
                onChange({ ...block, sourceUrl: event.target.value })
              }
            />
          </label>
        </>
      )}
      {block.type === "TABLE" && (
        <>
          <label>
            Caption
            <input
              value={block.caption ?? ""}
              onChange={(event) =>
                onChange({ ...block, caption: event.target.value })
              }
            />
          </label>
          <label>
            Headers (use | between cells)
            <input
              value={block.headers.join(" | ")}
              onChange={(event) =>
                onChange({
                  ...block,
                  headers: event.target.value
                    .split("|")
                    .map((value) => value.trim()),
                })
              }
            />
          </label>
          <label>
            Rows (one row per line; use | between cells)
            <textarea
              rows={5}
              value={block.rows.map((row) => row.join(" | ")).join("\n")}
              onChange={(event) =>
                onChange({
                  ...block,
                  rows: event.target.value
                    .split("\n")
                    .filter(Boolean)
                    .map((row) => row.split("|").map((value) => value.trim())),
                })
              }
            />
          </label>
        </>
      )}
      {block.type === "LIST" && (
        <>
          <label>
            Style
            <select
              value={block.style}
              onChange={(event) =>
                onChange({
                  ...block,
                  style: event.target.value as "ORDERED" | "UNORDERED",
                })
              }
            >
              <option value="UNORDERED">Bullets</option>
              <option value="ORDERED">Numbered</option>
            </select>
          </label>
          <label>
            Items (one per line)
            <textarea
              rows={5}
              value={block.items.join("\n")}
              onChange={(event) =>
                onChange({ ...block, items: event.target.value.split("\n") })
              }
            />
          </label>
        </>
      )}
      {block.type === "QUOTE" && (
        <>
          <label>
            Quotation
            <textarea
              rows={4}
              value={block.text}
              onChange={(event) =>
                onChange({ ...block, text: event.target.value })
              }
            />
          </label>
          <label>
            Attribution
            <input
              value={block.attribution ?? ""}
              onChange={(event) =>
                onChange({ ...block, attribution: event.target.value })
              }
            />
          </label>
          <label>
            Source URL
            <input
              value={block.sourceUrl ?? ""}
              onChange={(event) =>
                onChange({ ...block, sourceUrl: event.target.value })
              }
            />
          </label>
        </>
      )}
      {block.type === "CALLOUT" && (
        <>
          <label>
            Title
            <input
              value={block.title ?? ""}
              onChange={(event) =>
                onChange({ ...block, title: event.target.value })
              }
            />
          </label>
          <label>
            Tone
            <select
              value={block.tone}
              onChange={(event) =>
                onChange({
                  ...block,
                  tone: event.target.value as "NOTE" | "CONTEXT" | "CAUTION",
                })
              }
            >
              <option value="NOTE">Note</option>
              <option value="CONTEXT">Context</option>
              <option value="CAUTION">Caution</option>
            </select>
          </label>
          <label>
            Text
            <textarea
              rows={4}
              value={block.text}
              onChange={(event) =>
                onChange({ ...block, text: event.target.value })
              }
            />
          </label>
        </>
      )}
    </article>
  );
}

export function EditorialWorkspace({
  connected = false,
}: {
  connected?: boolean;
}) {
  const [token, setToken] = useState("");
  const [questions, setQuestions] = useState<EditorialQuestion[]>([]);
  const [message, setMessage] = useState(
    "Enter the editorial token to load the workspace.",
  );
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<EditorialDetail | null>(null);
  const [editorSections, setEditorSections] = useState<StoryEditorSection[]>(
    [],
  );
  const [editorContext, setEditorContext] = useState("");
  const [editorTimeline, setEditorTimeline] = useState<TimelineEditorEvent[]>(
    [],
  );
  const [editorKeyTerms, setEditorKeyTerms] = useState<KeyTermEditorItem[]>([]);
  const [editorPeople, setEditorPeople] = useState<PersonEditorItem[]>([]);
  const [editorAnswerAttempts, setEditorAnswerAttempts] = useState<
    AnswerAttemptEditorItem[]
  >([]);
  const [editorCategoryId, setEditorCategoryId] = useState("");
  const [previewStory, setPreviewStory] = useState(false);
  const [proposal, setProposal] = useState<EnrichmentProposal | null>(null);
  const [approvedRelationships, setApprovedRelationships] = useState<
    Set<string>
  >(new Set());
  const [relationshipSuggestions, setRelationshipSuggestions] = useState<
    EnrichmentProposal["relationships"]
  >([]);
  const [manualTargetId, setManualTargetId] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");
  const [agentSpecification, setAgentSpecification] = useState("");
  const [lastImportedTerms, setLastImportedTerms] = useState<string[]>([]);
  const [externalProposal, setExternalProposal] =
    useState<ImportableQuestionSpecification | null>(null);
  const [proposalAgentName, setProposalAgentName] = useState("");
  const [proposalModelName, setProposalModelName] = useState("");
  const [acceptedProposalParts, setAcceptedProposalParts] = useState<Set<string>>(
    new Set(),
  );
  const [agentTokens, setAgentTokens] = useState<{
    id: string; label: string; expiresAt: string; revokedAt: string | null; lastUsedAt: string | null;
  }[]>([]);
  const [newAgentToken, setNewAgentToken] = useState("");
  const [editorVerifiedStatus, setEditorVerifiedStatus] = useState("OPEN");
  const [scope, setScope] = useState<"review" | "archive">("review");
  const [workspaceMode, setWorkspaceMode] = useState<"review" | "create">(
    "review",
  );
  const [reviewCount, setReviewCount] = useState(0);
  const [queueCategory, setQueueCategory] = useState("");
  const [queueStatus, setQueueStatus] = useState("");
  const [queueBatch, setQueueBatch] = useState("");
  const [queueReadiness, setQueueReadiness] = useState("");
  const [queueSearch, setQueueSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(queueSearch.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [queueSearch]);

  const filteredQuestions = useMemo(() => questions.filter((question) => {
    const checks = qualityChecks(question);
    const editoriallyReady = checks
      .filter((check) => ["summary", "story", "timeline", "sources"].includes(check.key))
      .every((check) => check.pass);
    return (!queueCategory || question.category_name === queueCategory) &&
      (!queueStatus || (question.verified_status ?? question.claimed_status) === queueStatus) &&
      (!queueBatch || batchLabel(question) === queueBatch) &&
      (!queueReadiness || (queueReadiness === "ready" ? editoriallyReady : !editoriallyReady));
  }), [questions, queueBatch, queueCategory, queueReadiness, queueStatus]);

  const workingQuality = useMemo(() => {
    if (!editing) return null;
    const approvedSourceCount = editorAnswerAttempts.filter(
      (attempt) => attempt.approved && /^https:\/\//i.test(attempt.url.trim()),
    ).length;
    return evaluateEditorialQuality({
      contextSummary: editorContext,
      verifiedStatus: editorVerifiedStatus,
      sections: editorSections,
      timeline: editorTimeline,
      keyTerms: editorKeyTerms,
      verifiedSourceCount: (editing.reference_count ?? 0) + approvedSourceCount,
      pendingConnectionCount: relationshipSuggestions.filter(
        (relationship) =>
          !approvedRelationships.has(
            `${relationship.targetId}:${relationship.type}`,
          ),
      ).length,
    });
  }, [
    approvedRelationships,
    editing,
    editorAnswerAttempts,
    editorContext,
    editorKeyTerms,
    editorSections,
    editorTimeline,
    editorVerifiedStatus,
    relationshipSuggestions,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setToken(sessionStorage.getItem("tambaya-editorial-token") ?? ""),
      0,
    );
    return () => window.clearTimeout(timer);
  }, []);

  const api = useCallback(
    async (url: string, init?: RequestInit) => {
      const response = await fetch(url, {
        ...init,
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          ...init?.headers,
          ...(token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {}),
        },
      });
      const result = (await response.json()) as {
        error?: string;
        questions?: EditorialQuestion[];
        question?: EditorialDetail;
        proposal?: EnrichmentProposal;
        contextSummary?: string;
        timeline?: TimelineEditorEvent[];
        keyTerms?: KeyTermEditorItem[];
        reviewCount?: number;
        externalProposal?: unknown;
        tokens?: unknown[];
        token?: string;
      };
      if (!response.ok)
        throw new Error(result.error ?? "The editorial request failed.");
      return result;
    },
    [token],
  );

  const load = useCallback(async () => {
    setBusy(true);
    try {
      sessionStorage.setItem("tambaya-editorial-token", token.trim());
      const params = new URLSearchParams({ scope });
      if (debouncedSearch) params.set("q", debouncedSearch);
      const result = await api(`/api/editorial/questions?${params}`);
      setQuestions(result.questions ?? []);
      setReviewCount(result.reviewCount ?? 0);
      setMessage(
        scope === "review"
          ? `${result.reviewCount ?? 0} publisher submission${result.reviewCount === 1 ? "" : "s"} awaiting review.`
          : "Question archive loaded.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load the workspace.",
      );
    } finally {
      setBusy(false);
    }
  }, [api, token, scope, debouncedSearch]);

  useEffect(() => {
    if (!connected) return;
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [connected, load]);

  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = event.currentTarget;
    try {
      await api("/api/editorial/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      form.reset();
      setWorkspaceMode("review");
      setScope("review");
      setMessage(
        "Draft saved. It remains private until reviewed and published.",
      );
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save the draft.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function publish(question: EditorialQuestion, verifiedStatus: string) {
    if (
      !window.confirm(
        `Publish “${question.question_text}” with status ${labels[verifiedStatus]}?`,
      )
    )
      return;
    setBusy(true);
    try {
      await api(`/api/editorial/questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", verifiedStatus }),
      });
      setMessage("Question reviewed and published.");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to publish the draft.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function requestChanges(question: EditorialQuestion) {
    const reviewNotes = window.prompt("What should the publisher revise?");
    if (!reviewNotes) return;
    setBusy(true);
    try {
      await api(`/api/editorial/questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_changes", reviewNotes }),
      });
      setMessage(
        "The submission was returned to its publisher with your note.",
      );
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to request changes.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function rejectQuestion(question: EditorialQuestion) {
    const reviewNotes = window.prompt(
      "Why is this question unsuitable for Tambaya? This decision is final for this submission.",
    );
    if (!reviewNotes) return;
    if (
      !window.confirm(
        `Reject “${question.question_text}”? The publisher will not be able to edit or resubmit it.`,
      )
    )
      return;
    setBusy(true);
    try {
      await api(`/api/editorial/questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reviewNotes }),
      });
      setMessage(
        "The question was rejected and the publisher can view the reason.",
      );
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to reject the question.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function openEditor(question: EditorialQuestion) {
    setBusy(true);
    try {
      if (question.publication_state === "PUBLISHED")
        await api(`/api/editorial/questions/${question.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "begin_revision" }),
        });
      const result = await api(`/api/editorial/questions/${question.id}`);
      const detail = result.question;
      if (!detail) throw new Error("The Story could not be loaded.");
      const defaults = ["Origins", "Evolution", "Why it matters"].map(
        (title, index) => ({
          key: `section-${index + 1}`,
          kicker: "Context",
          title,
          paragraphs: [""],
        }),
      );
      setEditing(detail);
      setEditorContext(detail.context_summary);
      setEditorCategoryId(detail.category_id);
      setEditorSections(detail.sections.length ? detail.sections : defaults);
      setEditorTimeline(detail.timeline ?? []);
      setEditorKeyTerms(detail.keyTerms ?? []);
      setEditorPeople(detail.people ?? []);
      setEditorAnswerAttempts(
        (detail.answerAttempts ?? []).map((attempt) => ({
          ...attempt,
          approved: true,
        })),
      );
      setPreviewStory(false);
      setRelationshipSuggestions(detail.relationships ?? []);
      setManualTargetId("");
      setEditorVerifiedStatus(
        detail.verified_status ?? detail.claimed_status ?? "OPEN",
      );
      setApprovedRelationships(
        new Set(
          (detail.relationships ?? [])
            .filter((relationship) => relationship.verified)
            .map(
              (relationship) => `${relationship.targetId}:${relationship.type}`,
            ),
        ),
      );
      setProposal(null);
      setAgentSpecification("");
      setLastImportedTerms([]);
      setExternalProposal(null);
      setAcceptedProposalParts(new Set());
      const savedProposal = await api(
        `/api/editorial/questions/${question.id}/proposal`,
      );
      const persisted = savedProposal.externalProposal as
        | {
            specification?: ImportableQuestionSpecification;
            agentName?: string;
            modelName?: string;
          }
        | undefined;
      if (persisted?.specification) {
        setExternalProposal(persisted.specification);
        setProposalAgentName(persisted.agentName ?? "");
        setProposalModelName(persisted.modelName ?? "");
      }
      const tokenResult = await api(
        `/api/editorial/questions/${question.id}/agent-tokens`,
      );
      setAgentTokens((tokenResult.tokens as typeof agentTokens | undefined) ?? []);
      setNewAgentToken("");
      setMessage("Story editor opened.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to open the Story editor.",
      );
    } finally {
      setBusy(false);
    }
  }

  function updateSection(
    index: number,
    field: "kicker" | "title" | "paragraph",
    value: string,
  ) {
    setEditorSections((current) =>
      current.map((section, position) => {
        if (position !== index) return section;
        if (field !== "paragraph") return { ...section, [field]: value };
        const blocks = section.blocks?.length
          ? section.blocks.map((block, blockIndex) =>
              blockIndex === 0 && block.type === "PARAGRAPH"
                ? { ...block, text: value }
                : block,
            )
          : [{ type: "PARAGRAPH" as const, text: value }];
        return { ...section, paragraphs: [value], blocks };
      }),
    );
  }

  function addBlock(sectionIndex: number, type: StoryBlock["type"]) {
    const block: StoryBlock =
      type === "IMAGE"
        ? { type, src: "https://", alt: "", caption: "", credit: "" }
        : type === "TABLE"
          ? {
              type,
              caption: "",
              headers: ["Column 1", "Column 2"],
              rows: [["", ""]],
            }
          : type === "LIST"
            ? { type, style: "UNORDERED", items: [""] }
            : type === "QUOTE"
              ? { type, text: "", attribution: "" }
              : type === "CALLOUT"
                ? { type, tone: "CONTEXT", title: "", text: "" }
                : type === "HEADING"
                  ? { type, level: 3, text: "" }
                  : { type, text: "" };
    setEditorSections((current) =>
      current.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              blocks: [
                ...(section.blocks ??
                  section.paragraphs.map((text) => ({
                    type: "PARAGRAPH" as const,
                    text,
                  }))),
                block,
              ],
            }
          : section,
      ),
    );
  }

  function replaceBlock(
    sectionIndex: number,
    blockIndex: number,
    block: StoryBlock,
  ) {
    setEditorSections((current) =>
      current.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              blocks: (section.blocks ?? []).map((item, position) =>
                position === blockIndex ? block : item,
              ),
            }
          : section,
      ),
    );
  }
  function removeBlock(sectionIndex: number, blockIndex: number) {
    setEditorSections((current) =>
      current.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              blocks: (section.blocks ?? []).filter(
                (_, position) => position !== blockIndex,
              ),
            }
          : section,
      ),
    );
  }

  function currentAgentBrief() {
    if (!editing) throw new Error("Open a question before exporting it.");
    const sameCategoryQuestions = editing.candidates.filter(
      (candidate) => candidate.categoryId === editorCategoryId,
    );
    return buildQuestionAgentBrief({
      questionId: editing.id,
      questionTitle: editing.question_text,
      categories: editing.categories,
      relationshipCandidates: sameCategoryQuestions,
      currentSpecification: {
        contextSummary: editorContext,
        categoryId: editorCategoryId,
        verifiedStatus: editorVerifiedStatus as AnswerStatus,
        sections: editorSections,
        timeline: editorTimeline,
        keyTerms: editorKeyTerms,
        people: editorPeople,
        answerAttempts: editorAnswerAttempts.map((attempt) => ({
          title: attempt.title,
          author: attempt.author,
          publisher: attempt.publisher,
          url: attempt.url,
          publicationDate: attempt.publicationDate,
          approach: attempt.approach,
          scope: attempt.scope,
          significance: attempt.significance,
          unresolved: attempt.unresolved,
        })),
        relationships: relationshipSuggestions,
      },
    });
  }

  async function copyAgentBrief() {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(currentAgentBrief(), null, 2),
      );
      setMessage(
        "External-agent brief copied. Paste it into the agent and ask it to return the responseContract JSON only.",
      );
    } catch {
      setMessage("The browser could not copy the external-agent brief.");
    }
  }

  function downloadAgentBrief() {
    if (!editing) return;
    const blob = new Blob([JSON.stringify(currentAgentBrief(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tambaya-${editing.id}-agent-brief.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("External-agent brief downloaded as JSON.");
  }

  function importAgentSpecification(raw = agentSpecification) {
    if (!editing) return;
    try {
      const imported = parseQuestionSpecification(raw, {
        questionId: editing.id,
        categoryIds: new Set(editing.categories.map((category) => category.id)),
        relationshipTargets: new Map(
          editing.candidates
            .filter((candidate) => candidate.categoryId === editorCategoryId)
            .map((candidate) => [
            candidate.id,
            { slug: candidate.slug, questionText: candidate.questionText },
          ]),
        ),
      });
      setExternalProposal(imported);
      setAcceptedProposalParts(new Set());
      setAgentSpecification("");
      setLastImportedTerms(imported.keyTerms.map((item) => item.term));
      void api(`/api/editorial/questions/${editing.id}/proposal`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specification: imported,
          agentName: proposalAgentName,
          modelName: proposalModelName,
        }),
      }).catch(() =>
        setMessage(
          "Proposal loaded for review, but its private saved copy could not be updated.",
        ),
      );
      setMessage(
        `External proposal staged with ${imported.sections.length} Story sections, ${imported.keyTerms.length} key term${imported.keyTerms.length === 1 ? "" : "s"}, and ${imported.people.length} associated ${imported.people.length === 1 ? "person" : "people"}. Choose which parts to apply.`,
      );
      window.setTimeout(
        () =>
          document.getElementById("external-proposal-review")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        0,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Import rejected: ${error.message}`
          : "The external specification could not be imported.",
      );
    }
  }

  function applyExternalProposal() {
    if (!externalProposal || !acceptedProposalParts.size) return;
    if (acceptedProposalParts.has("summary"))
      setEditorContext(externalProposal.contextSummary);
    if (acceptedProposalParts.has("classification")) {
      setEditorCategoryId(externalProposal.categoryId);
      setEditorVerifiedStatus(externalProposal.verifiedStatus);
    }
    if (acceptedProposalParts.has("story"))
      setEditorSections(externalProposal.sections);
    if (acceptedProposalParts.has("timeline"))
      setEditorTimeline(externalProposal.timeline);
    if (acceptedProposalParts.has("terms"))
      setEditorKeyTerms(externalProposal.keyTerms);
    if (acceptedProposalParts.has("people"))
      setEditorPeople(externalProposal.people);
    if (acceptedProposalParts.has("sources"))
      setEditorAnswerAttempts(
        externalProposal.answerAttempts.map((attempt) => ({
          ...attempt,
          approved: false,
        })),
      );
    if (acceptedProposalParts.has("connections")) {
      setRelationshipSuggestions(externalProposal.relationships);
      setApprovedRelationships(new Set());
    }
    setProposal(null);
    setMessage(
      `${acceptedProposalParts.size} selected external proposal part${acceptedProposalParts.size === 1 ? "" : "s"} applied to the unsaved working copy. Sources and connections remain unapproved.`,
    );
  }

  async function discardExternalProposal() {
    if (!editing || !externalProposal) return;
    if (!window.confirm("Discard this saved external proposal?")) return;
    try {
      await api(`/api/editorial/questions/${editing.id}/proposal`, {
        method: "DELETE",
      });
      setExternalProposal(null);
      setAcceptedProposalParts(new Set());
      setLastImportedTerms([]);
      setMessage("External proposal discarded. The working copy was unchanged.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to discard proposal.",
      );
    }
  }

  async function createExternalAgentToken() {
    if (!editing) return;
    const label = window.prompt("Name this external agent token:", proposalAgentName || "External agent");
    if (!label) return;
    try {
      const result = await api(`/api/editorial/questions/${editing.id}/agent-tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, expiresInDays: 7 }),
      }) as { token?: string };
      setNewAgentToken(result.token ?? "");
      const refreshed = await api(`/api/editorial/questions/${editing.id}/agent-tokens`);
      setAgentTokens((refreshed.tokens as typeof agentTokens | undefined) ?? []);
      setMessage("Agent token created. Copy it now; Tambaya will not display it again.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create agent token.");
    }
  }

  async function revokeExternalAgentToken(tokenId: string) {
    if (!editing || !window.confirm("Revoke this agent token immediately?")) return;
    try {
      await api(`/api/editorial/questions/${editing.id}/agent-tokens?tokenId=${encodeURIComponent(tokenId)}`, { method: "DELETE" });
      setAgentTokens((current) => current.map((item) => item.id === tokenId ? { ...item, revokedAt: new Date().toISOString() } : item));
      setMessage("Agent token revoked.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to revoke agent token.");
    }
  }

  async function enrichStory(instruction = "") {
    if (
      !editing ||
      !window.confirm(
        "Generate a private AI proposal? This will replace the sections currently shown in the form, but nothing is saved or published yet.",
      )
    )
      return;
    setBusy(true);
    setMessage(
      "Generating an encyclopedic proposal and running safety checks…",
    );
    try {
      const result = await api(
        `/api/editorial/questions/${editing.id}/enrich`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction,
            contextSummary: editorContext,
            timeline: editorTimeline,
            keyTerms: editorKeyTerms,
            people: editorPeople,
            answerAttempts: editorAnswerAttempts,
            verifiedStatus: editorVerifiedStatus,
            categoryId: editorCategoryId,
            sections: editorSections,
          }),
        },
      );
      if (result.contextSummary) {
        setEditorContext(result.contextSummary);
        setAiInstruction("");
        setMessage(
          "AI context summary inserted into the working copy. Review it, then save the revision.",
        );
        return;
      }
      if (!result.proposal)
        throw new Error("The enrichment service returned no proposal.");
      setProposal(result.proposal);
      setRelationshipSuggestions(result.proposal.relationships);
      setApprovedRelationships(new Set());
      setEditorContext(result.proposal.contextSummary);
      setEditorTimeline(result.proposal.timeline);
      setEditorKeyTerms(result.proposal.keyTerms);
      setEditorPeople(result.proposal.people);
      setEditorAnswerAttempts(
        result.proposal.answerAttempts.map((attempt) => ({
          ...attempt,
          approved: false,
        })),
      );
      setEditorSections(result.proposal.sections);
      setAiInstruction("");
      setMessage(
        `Proposal ready with ${result.proposal.answerAttempts.length} answer-attempt candidate${result.proposal.answerAttempts.length === 1 ? "" : "s"}. Verify the claims and sources, then save the private revision.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to enrich this Story.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveStory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      await api(`/api/editorial/questions/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:
            editing.publication_state === "PUBLISHED"
              ? "save_revision"
              : "save_story",
          contextSummary: editorContext,
          timeline: editorTimeline,
          keyTerms: editorKeyTerms,
          people: editorPeople,
          answerAttempts: editorAnswerAttempts.filter(
            (attempt) => attempt.approved,
          ),
          categoryId: editorCategoryId,
          sections: editorSections,
          relationships: relationshipSuggestions.filter((relationship) =>
            approvedRelationships.has(
              `${relationship.targetId}:${relationship.type}`,
            ),
          ),
        }),
      });
      setMessage("Story sections saved as a new private revision.");
      setEditing(null);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save the Story.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function publishRevision() {
    if (
      !editing ||
      !window.confirm(
        `Replace the live Story for “${editing.question_text}” with this reviewed revision?`,
      )
    )
      return;
    setBusy(true);
    try {
      await api(`/api/editorial/questions/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_revision",
          contextSummary: editorContext,
          timeline: editorTimeline,
          keyTerms: editorKeyTerms,
          people: editorPeople,
          answerAttempts: editorAnswerAttempts.filter(
            (attempt) => attempt.approved,
          ),
          categoryId: editorCategoryId,
          sections: editorSections,
          relationships: relationshipSuggestions.filter((relationship) =>
            approvedRelationships.has(
              `${relationship.targetId}:${relationship.type}`,
            ),
          ),
        }),
      });
      await api(`/api/editorial/questions/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish_revision" }),
      });
      setMessage(
        "The sections shown in the editor were saved and published. The previous Story remains in revision history.",
      );
      setEditing(null);
      setProposal(null);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to publish the revision.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function discardRevision() {
    if (
      !editing ||
      !window.confirm(
        "Discard this private working copy? The live Story will remain unchanged.",
      )
    )
      return;
    setBusy(true);
    try {
      await api(`/api/editorial/questions/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discard_revision" }),
      });
      setEditing(null);
      setMessage("Private revision discarded; the live Story was not changed.");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to discard the revision.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveAndPublish(openNext = false) {
    if (
      !editing ||
      editing.publication_state !== "DRAFT" ||
      !window.confirm(
        `Save the working copy and publish “${editing.question_text}” with status ${labels[editorVerifiedStatus]}${openNext ? ", then open the next filtered question" : ""}?`,
      )
    )
      return;
    setBusy(true);
    const nextQuestion = openNext
      ? filteredQuestions.find((question) => question.id !== editing.id)
      : undefined;
    try {
      await api(`/api/editorial/questions/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_story",
          contextSummary: editorContext,
          timeline: editorTimeline,
          keyTerms: editorKeyTerms,
          people: editorPeople,
          answerAttempts: editorAnswerAttempts.filter(
            (attempt) => attempt.approved,
          ),
          categoryId: editorCategoryId,
          sections: editorSections,
          relationships: relationshipSuggestions.filter((relationship) =>
            approvedRelationships.has(
              `${relationship.targetId}:${relationship.type}`,
            ),
          ),
        }),
      });
      await api(`/api/editorial/questions/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          verifiedStatus: editorVerifiedStatus,
        }),
      });
      setMessage(
        "The visible working copy was saved, reviewed, and published.",
      );
      setEditing(null);
      await load();
      if (nextQuestion) await openEditor(nextQuestion);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save and publish the question.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="editorial-workspace">
      {!connected ? (
        <form
          className="editorial-access"
          onSubmit={(event) => {
            event.preventDefault();
            void load();
          }}
        >
          <label>
            Editorial token
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Stored only for this browser session"
            />
          </label>
          <button
            className="button small"
            type="submit"
            disabled={busy || !token.trim()}
          >
            {busy ? "Working…" : "Open workspace"}
          </button>
          <p role="status">{message}</p>
        </form>
      ) : (
        <section className="editorial-access session-active">
          <strong>Secure editorial session active</strong>
          <p role="status">{message}</p>
        </section>
      )}
      {connected && (
        <nav className="editorial-scope">
          <button
            type="button"
            className={
              workspaceMode === "review" && scope === "review" ? "active" : ""
            }
            onClick={() => {
              setWorkspaceMode("review");
              setScope("review");
            }}
          >
            Review queue <span>{reviewCount}</span>
          </button>
          <button
            type="button"
            className={
              workspaceMode === "review" && scope === "archive" ? "active" : ""
            }
            onClick={() => {
              setWorkspaceMode("review");
              setScope("archive");
            }}
          >
            Question archive
          </button>
          <button
            type="button"
            className={workspaceMode === "create" ? "active" : ""}
            onClick={() => setWorkspaceMode("create")}
          >
            Create private draft
          </button>
          <button type="button" onClick={() => void load()} disabled={busy}>
            Refresh
          </button>
        </nav>
      )}
      {(questions.length > 0 || workspaceMode === "create") && (
        <>
          <div className={`editorial-grid workspace-${workspaceMode}`}>
            <form className="editorial-form" onSubmit={createDraft}>
              <span className="eyebrow">New record</span>
              <h2>Create a private draft</h2>
              <label>
                Question
                <input
                  name="questionText"
                  required
                  minLength={10}
                  placeholder="What is a question worth preserving?"
                />
              </label>
              <label>
                Claimed status
                <select name="claimedStatus" defaultValue="OPEN">
                  <option value="OPEN">Open</option>
                  <option value="PARTIALLY_ANSWERED">Partially answered</option>
                  <option value="ANSWERED">Answered</option>
                </select>
              </label>
              <label>
                Category
                <input name="category" required placeholder="Philosophy" />
              </label>
              <label>
                Context summary
                <textarea
                  name="contextSummary"
                  required
                  minLength={150}
                  rows={8}
                  placeholder="At least 150 characters describing the question’s history and importance without resolving it."
                />
              </label>
              <button className="button" disabled={busy}>
                Save private draft →
              </button>
            </form>
            <section className="editorial-queue">
              <span className="eyebrow">
                {scope === "review"
                  ? "Publisher submissions"
                  : "Published records"}
              </span>
              <h2>
                {scope === "review"
                  ? "Awaiting editorial review"
                  : "Question archive"}
              </h2>
              <div className="discovery-controls editorial-queue-filters">
                <label className="editorial-question-search">
                  Search questions
                  <input type="search" value={queueSearch} onChange={(event) => setQueueSearch(event.target.value)} placeholder="Title, summary, category, or slug…" autoComplete="off" />
                </label>
                <label>
                  Batch
                  <select value={queueBatch} onChange={(event) => setQueueBatch(event.target.value)}>
                    <option value="">All batches</option>
                    {[...new Set(questions.map(batchLabel))].sort().map((batch) => <option key={batch}>{batch}</option>)}
                  </select>
                </label>
                <label>
                  Category
                  <select value={queueCategory} onChange={(event) => setQueueCategory(event.target.value)}>
                    <option value="">All categories</option>
                    {[...new Set(questions.map((question) => question.category_name))].sort().map((category) => <option key={category}>{category}</option>)}
                  </select>
                </label>
                <label>
                  Status
                  <select value={queueStatus} onChange={(event) => setQueueStatus(event.target.value)}>
                    <option value="">All statuses</option>
                    <option value="OPEN">Open</option>
                    <option value="PARTIALLY_ANSWERED">Partially answered</option>
                    <option value="ANSWERED">Answered</option>
                  </select>
                </label>
                <label>
                  Completeness
                  <select value={queueReadiness} onChange={(event) => setQueueReadiness(event.target.value)}>
                    <option value="">All levels</option>
                    <option value="ready">Editorially ready</option>
                    <option value="needs-work">Needs work</option>
                  </select>
                </label>
                <span>{queueSearch.trim() ? `${filteredQuestions.length} matching result${filteredQuestions.length === 1 ? "" : "s"}` : `${filteredQuestions.length} of ${questions.length} shown`}</span>
              </div>
              {editing && (
                <form className="story-editor" onSubmit={saveStory}>
                  <div className="story-editor-head">
                    <div>
                      <small>Private Story revision</small>
                      <h3>{editing.question_text}</h3>
                    </div>
                    <div className="story-editor-head-actions">
                      <button
                        type="button"
                        className="button ghost small"
                        aria-pressed={previewStory}
                        onClick={() => setPreviewStory((value) => !value)}
                      >
                        {previewStory ? "Hide preview" : "Preview question"}
                      </button>
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => setEditing(null)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  {previewStory && (
                    <section
                      className="submission-preview editorial-live-preview"
                      aria-label="Question preview"
                    >
                      <span className="eyebrow">
                        Reader preview · current working copy
                      </span>
                      <h1>{editing.question_text}</h1>
                      <p className="lead">
                        {editorContext ||
                          "The context summary has not been written yet."}
                      </p>
                      {editorSections.map((section, index) => (
                        <section key={`${section.key}-preview-${index}`}>
                          <span className="eyebrow">{section.kicker}</span>
                          <h2>
                            {section.title || `Untitled section ${index + 1}`}
                          </h2>
                          <StoryBlocks
                            blocks={
                              section.blocks?.length
                                ? section.blocks
                                : section.paragraphs
                                    .filter(Boolean)
                                    .map((text) => ({
                                      type: "PARAGRAPH" as const,
                                      text,
                                    }))
                            }
                          />
                        </section>
                      ))}
                      {editorTimeline.length > 0 && (
                        <section>
                          <span className="eyebrow">Key moments</span>
                          <h2>How the asking changed</h2>
                          {editorTimeline.map((event, index) => (
                            <article key={`${event.displayDate}-${index}`}>
                              <small>{event.displayDate}</small>
                              <h3>{event.title}</h3>
                              <p>{event.description}</p>
                            </article>
                          ))}
                        </section>
                      )}
                      {editorKeyTerms.length > 0 && (
                        <section>
                          <span className="eyebrow">Vocabulary</span>
                          <h2>Terms that shape the question</h2>
                          {editorKeyTerms.map((item, index) => (
                            <article key={`${item.term}-${index}`}>
                              <h3>{item.term}</h3>
                              <p>{item.description}</p>
                            </article>
                          ))}
                        </section>
                      )}
                      {editorPeople.length > 0 && (
                        <section>
                          <span className="eyebrow">People in its history</span>
                          <h2>Associated with the inquiry</h2>
                          {editorPeople.map((person, index) => (
                            <article key={`${person.name}-${index}`}>
                              <small>{person.period}</small>
                              <h3>{person.name}</h3>
                              <p>{person.association}</p>
                            </article>
                          ))}
                        </section>
                      )}
                      {editorAnswerAttempts.some(
                        (attempt) => attempt.approved,
                      ) && (
                        <section>
                          <span className="eyebrow">Intellectual history</span>
                          <h2>Attempts to answer this question</h2>
                          {editorAnswerAttempts
                            .filter((attempt) => attempt.approved)
                            .map((attempt, index) => (
                              <article key={`${attempt.url}-${index}`}>
                                <small>{attempt.publicationDate}</small>
                                <h3>{attempt.title}</h3>
                                <p>{attempt.approach}</p>
                                <p>
                                  <strong>What remained open:</strong>{" "}
                                  {attempt.unresolved}
                                </p>
                              </article>
                            ))}
                        </section>
                      )}
                    </section>
                  )}
                  {workingQuality && (
                    <aside
                      className={`publication-checklist ${workingQuality.ready ? "quality-pass" : "quality-missing"}`}
                      aria-live="polite"
                    >
                      <span className="eyebrow">Publication gate</span>
                      <h4>
                        {workingQuality.ready
                          ? "Ready to publish"
                          : `${workingQuality.blockers.length} requirement${workingQuality.blockers.length === 1 ? "" : "s"} remaining`}
                      </h4>
                      {workingQuality.ready ? (
                        <p>
                          The working copy passes the Story, history, source,
                          status, connection-review, and answer-safety checks.
                        </p>
                      ) : (
                        <ul>
                          {workingQuality.blockers.map((blocker) => (
                            <li key={blocker.code}>
                              <button
                                type="button"
                                className="text-link"
                                onClick={() =>
                                  document
                                    .getElementById(blocker.anchor)
                                    ?.scrollIntoView({
                                      behavior: "smooth",
                                      block: "center",
                                    })
                                }
                              >
                                {blocker.label}
                              </button>
                              <span>{blocker.message}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </aside>
                  )}
                  <section className="enrichment-panel">
                    <div>
                      <span className="eyebrow">AI-assisted draft</span>
                      <h4>Build an encyclopedic proposal</h4>
                      <p>
                        Generates contextual sections, source leads, and a
                        preliminary status assessment. Nothing is saved until
                        you approve it.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="button small"
                      disabled={busy}
                      onClick={() => void enrichStory()}
                    >
                      {busy ? "Working…" : "Enrich question"}
                    </button>
                    {message.includes("rejected") ||
                    message.includes("Unable to enrich") ? (
                      <p className="notice">{message}</p>
                    ) : null}
                  </section>
                  <details className="agent-exchange">
                    <summary>Use an external AI agent</summary>
                    <div>
                      <span className="eyebrow">Portable specification</span>
                      <h4>Export the brief, then import the agent response</h4>
                      <p>
                        The brief contains this working copy, Tambaya’s
                        editorial rules, valid categories and relationship
                        targets, plus the exact JSON response contract. An
                        import changes only this unsaved editor.
                      </p>
                      <section className="agent-token-manager">
                        <header>
                          <div>
                            <strong>Scoped agent API</strong>
                            <small>
                              Tokens can read this question’s brief and stage a
                              proposal. They cannot edit or publish.
                            </small>
                          </div>
                          <button
                            type="button"
                            className="button ghost small"
                            onClick={() => void createExternalAgentToken()}
                          >
                            Create 7-day token
                          </button>
                        </header>
                        {newAgentToken && (
                          <div className="one-time-token">
                            <strong>Copy this token now</strong>
                            <code>{newAgentToken}</code>
                            <button
                              type="button"
                              className="text-link"
                              onClick={() =>
                                void navigator.clipboard.writeText(newAgentToken)
                              }
                            >
                              Copy token
                            </button>
                          </div>
                        )}
                        <code className="agent-endpoint">
                          {`GET /api/agent/questions/${editing.id}`}
                        </code>
                        {agentTokens.length > 0 && (
                          <div className="agent-token-list">
                            {agentTokens.map((item) => (
                              <article key={item.id}>
                                <span>
                                  <strong>{item.label}</strong>
                                  <small>
                                    Expires {item.expiresAt}
                                    {item.lastUsedAt
                                      ? ` · last used ${item.lastUsedAt}`
                                      : " · never used"}
                                  </small>
                                </span>
                                {item.revokedAt ? (
                                  <small>Revoked</small>
                                ) : (
                                  <button
                                    type="button"
                                    className="text-link"
                                    onClick={() =>
                                      void revokeExternalAgentToken(item.id)
                                    }
                                  >
                                    Revoke
                                  </button>
                                )}
                              </article>
                            ))}
                          </div>
                        )}
                      </section>
                      <div className="agent-provenance-fields">
                        <label>
                          External agent or provider
                          <input
                            value={proposalAgentName}
                            maxLength={120}
                            onChange={(event) =>
                              setProposalAgentName(event.target.value)
                            }
                            placeholder="For example: Claude"
                          />
                        </label>
                        <label>
                          Model
                          <input
                            value={proposalModelName}
                            maxLength={120}
                            onChange={(event) =>
                              setProposalModelName(event.target.value)
                            }
                            placeholder="Optional model identifier"
                          />
                        </label>
                      </div>
                      <div className="agent-exchange-actions">
                        <button
                          type="button"
                          className="button ghost small"
                          onClick={() => void copyAgentBrief()}
                        >
                          Copy agent brief
                        </button>
                        <button
                          type="button"
                          className="button ghost small"
                          onClick={downloadAgentBrief}
                        >
                          Download JSON brief
                        </button>
                        <label className="button ghost small file-button">
                          Import JSON file
                          <input
                            type="file"
                            accept="application/json,.json"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              event.target.value = "";
                              if (!file) return;
                              if (file.size > MAX_QUESTION_SPEC_BYTES) {
                                setMessage("Import rejected: the file is larger than 1 MB.");
                                return;
                              }
                              void file
                                .text()
                                .then(importAgentSpecification)
                                .catch(() =>
                                  setMessage(
                                    "Import rejected: the selected file could not be read.",
                                  ),
                                );
                            }}
                          />
                        </label>
                      </div>
                      <label>
                        Paste the agent’s JSON response
                        <textarea
                          rows={8}
                          maxLength={MAX_QUESTION_SPEC_BYTES}
                          value={agentSpecification}
                          onChange={(event) =>
                            setAgentSpecification(event.target.value)
                          }
                          placeholder='{"protocol":"tambaya.question-specification","version":1,"questionId":"…","specification":{…}}'
                        />
                      </label>
                      <button
                        type="button"
                        className="button small"
                        disabled={!agentSpecification.trim()}
                        onClick={() => importAgentSpecification()}
                      >
                        Validate and load specification
                      </button>
                      {lastImportedTerms.length > 0 && (
                        <aside className="agent-import-result" aria-live="polite">
                          <strong>
                            Imported key terms ({lastImportedTerms.length})
                          </strong>
                          <div>
                            {lastImportedTerms.map((term) => (
                              <span key={term}>{term}</span>
                            ))}
                          </div>
                          <button
                            type="button"
                            className="text-link"
                            onClick={() =>
                              document
                                .getElementById("quality-terms")
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                })
                            }
                          >
                            Review imported terms
                          </button>
                        </aside>
                      )}
                      {externalProposal && (
                        <section
                          className="external-proposal-review"
                          id="external-proposal-review"
                        >
                          <header>
                            <div>
                              <span className="eyebrow">Private proposal</span>
                              <h4>Compare and select what to apply</h4>
                              <small>
                                {proposalAgentName || "Unspecified agent"}
                                {proposalModelName
                                  ? ` · ${proposalModelName}`
                                  : ""}
                              </small>
                            </div>
                            <button
                              type="button"
                              className="text-link"
                              onClick={() => void discardExternalProposal()}
                            >
                              Discard proposal
                            </button>
                          </header>
                          {[
                            {
                              key: "summary",
                              label: "Context summary",
                              current: editorContext,
                              proposed: externalProposal.contextSummary,
                            },
                            {
                              key: "classification",
                              label: "Classification",
                              current: `${editorCategoryId} · ${editorVerifiedStatus}`,
                              proposed: `${externalProposal.categoryId} · ${externalProposal.verifiedStatus}`,
                            },
                            {
                              key: "story",
                              label: "Story sections",
                              current: `${editorSections.length} sections`,
                              proposed: `${externalProposal.sections.length} sections`,
                            },
                            {
                              key: "timeline",
                              label: "Question history",
                              current: `${editorTimeline.length} events`,
                              proposed: `${externalProposal.timeline.length} events`,
                            },
                            {
                              key: "terms",
                              label: "Key terms",
                              current: editorKeyTerms.map((item) => item.term).join(", ") || "None",
                              proposed:
                                externalProposal.keyTerms
                                  .map((item) => item.term)
                                  .join(", ") || "None",
                            },
                            {
                              key: "people",
                              label: "People",
                              current: editorPeople.map((item) => item.name).join(", ") || "None",
                              proposed:
                                externalProposal.people
                                  .map((item) => item.name)
                                  .join(", ") || "None",
                            },
                            {
                              key: "sources",
                              label: "Sources",
                              current: `${editorAnswerAttempts.length} source records`,
                              proposed: `${externalProposal.answerAttempts.length} unverified proposals`,
                            },
                            {
                              key: "connections",
                              label: "Connections",
                              current: `${relationshipSuggestions.length} proposals`,
                              proposed: `${externalProposal.relationships.length} unverified proposals`,
                            },
                          ].map((part) => (
                            <article key={part.key}>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={acceptedProposalParts.has(part.key)}
                                  onChange={(event) =>
                                    setAcceptedProposalParts((current) => {
                                      const next = new Set(current);
                                      if (event.target.checked) next.add(part.key);
                                      else next.delete(part.key);
                                      return next;
                                    })
                                  }
                                />
                                <strong>{part.label}</strong>
                              </label>
                              <div>
                                <span>
                                  <small>Current</small>
                                  {part.current}
                                </span>
                                <span>
                                  <small>Proposed</small>
                                  {part.proposed}
                                </span>
                              </div>
                            </article>
                          ))}
                          <button
                            type="button"
                            className="button small"
                            disabled={!acceptedProposalParts.size}
                            onClick={applyExternalProposal}
                          >
                            Apply selected parts to working copy
                          </button>
                        </section>
                      )}
                    </div>
                  </details>
                  <section className="ai-change-request">
                    <label>
                      Ask AI to change the current working copy
                      <textarea
                        rows={3}
                        maxLength={1000}
                        value={aiInstruction}
                        onChange={(event) =>
                          setAiInstruction(event.target.value)
                        }
                        placeholder="For example: make the introduction less technical, preserve the sections on history, and add a section about methodological difficulties."
                      />
                    </label>
                    <button
                      type="button"
                      className="button ghost small"
                      disabled={busy || aiInstruction.trim().length < 10}
                      onClick={() => void enrichStory(aiInstruction.trim())}
                    >
                      Propose requested changes
                    </button>
                    <small>
                      The complete revised copy remains unsaved until you review
                      and save it.
                    </small>
                  </section>
                  {proposal && (
                    <aside className="enrichment-review">
                      <div>
                        <strong>
                          Status suggestion: {labels[proposal.suggestedStatus]}
                        </strong>
                        <span>
                          {proposal.statusConfidence.toLowerCase()} confidence
                        </span>
                      </div>
                      <p>{proposal.statusRationale}</p>
                      {proposal.sourceLeads.length > 0 && (
                        <details>
                          <summary>
                            {proposal.sourceLeads.length} source lead
                            {proposal.sourceLeads.length === 1 ? "" : "s"} to
                            verify
                          </summary>
                          <ul>
                            {proposal.sourceLeads.map((source) => (
                              <li key={source.url}>
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {source.title}
                                </a>{" "}
                                — {source.publisher} ({source.purpose})
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                      <section className="enrichment-attempt-summary">
                        <strong>
                          {proposal.answerAttempts.length} answer-attempt
                          candidate
                          {proposal.answerAttempts.length === 1 ? "" : "s"}
                        </strong>
                        {proposal.answerAttempts.length > 0 ? (
                          <>
                            <ul>
                              {proposal.answerAttempts.map((attempt, index) => (
                                <li key={`${attempt.title}-${index}`}>
                                  {attempt.title}
                                  {!attempt.url && " · source URL required"}
                                </li>
                              ))}
                            </ul>
                            <button
                              type="button"
                              className="button ghost small"
                              onClick={() =>
                                document
                                  .getElementById("answer-attempt-editor")
                                  ?.scrollIntoView({ behavior: "smooth" })
                              }
                            >
                              Review answer attempts
                            </button>
                          </>
                        ) : (
                          <p>
                            No candidates were returned. This diagnostic state
                            should not occur for an Open question.
                          </p>
                        )}
                      </section>
                      <small>{proposal.warnings.join(" ")}</small>
                    </aside>
                  )}
                  <section
                    className="relationship-proposals"
                    id="quality-connections"
                  >
                    <div>
                      <span className="eyebrow">Question graph</span>
                      <h4>Approve proposed connections</h4>
                      <p>
                        Suggestions are unchecked by default. Only selected
                        relationships are saved to the navigable question map.
                      </p>
                    </div>
                    <div className="manual-connection">
                      <select
                        aria-label="Published question to connect"
                        value={manualTargetId}
                        onChange={(event) =>
                          setManualTargetId(event.target.value)
                        }
                      >
                        <option value="">Select a published question…</option>
                        {(editing.candidates ?? [])
                          .filter(
                            (candidate) =>
                              !relationshipSuggestions.some(
                                (item) => item.targetId === candidate.id,
                              ),
                          )
                          .map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.questionText} · {candidate.category}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        className="button ghost small"
                        disabled={!manualTargetId}
                        onClick={() => {
                          const candidate = editing.candidates.find(
                            (item) => item.id === manualTargetId,
                          );
                          if (!candidate) return;
                          const relationship = {
                            targetId: candidate.id,
                            targetSlug: candidate.slug,
                            targetQuestion: candidate.questionText,
                            type: "RELATED_TO" as const,
                            confidence: 0.7,
                            rationale:
                              "Manually connected by an editor based on the question catalogue.",
                          };
                          setRelationshipSuggestions((current) => [
                            ...current,
                            relationship,
                          ]);
                          setApprovedRelationships((current) =>
                            new Set(current).add(
                              `${relationship.targetId}:${relationship.type}`,
                            ),
                          );
                          setManualTargetId("");
                        }}
                      >
                        Add connection
                      </button>
                    </div>
                    {relationshipSuggestions.length ? (
                      relationshipSuggestions.map((relationship) => {
                        const key = `${relationship.targetId}:${relationship.type}`;
                        return (
                          <label key={key}>
                            <input
                              type="checkbox"
                              checked={approvedRelationships.has(key)}
                              onChange={(event) =>
                                setApprovedRelationships((current) => {
                                  const next = new Set(current);
                                  if (event.target.checked) next.add(key);
                                  else next.delete(key);
                                  return next;
                                })
                              }
                            />
                            <span>
                              <strong>
                                This question{" "}
                                {relationshipLabels[relationship.type]} “
                                {relationship.targetQuestion}”
                              </strong>
                              <small>
                                {Math.round(relationship.confidence * 100)}%
                                confidence · {relationship.rationale}
                              </small>
                              <label>
                                Relationship type
                                <select
                                  value={relationship.type}
                                  onChange={(event) => {
                                    const nextType = event.target
                                      .value as typeof relationship.type;
                                    setRelationshipSuggestions((current) =>
                                      current.map((item) =>
                                        item === relationship
                                          ? { ...item, type: nextType }
                                          : item,
                                      ),
                                    );
                                    setApprovedRelationships((current) => {
                                      const next = new Set(current);
                                      next.delete(key);
                                      next.add(
                                        `${relationship.targetId}:${nextType}`,
                                      );
                                      return next;
                                    });
                                  }}
                                >
                                  {Object.entries(relationshipLabels).map(
                                    ([value, label]) => (
                                      <option key={value} value={value}>
                                        {label}
                                      </option>
                                    ),
                                  )}
                                </select>
                              </label>
                              <label>
                                Confidence (
                                {Math.round(relationship.confidence * 100)}%)
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.05"
                                  value={relationship.confidence}
                                  onChange={(event) =>
                                    setRelationshipSuggestions((current) =>
                                      current.map((item) =>
                                        item === relationship
                                          ? {
                                              ...item,
                                              confidence: Number(
                                                event.target.value,
                                              ),
                                            }
                                          : item,
                                      ),
                                    )
                                  }
                                />
                              </label>
                              <label>
                                Editorial rationale
                                <textarea
                                  rows={2}
                                  value={relationship.rationale}
                                  onChange={(event) =>
                                    setRelationshipSuggestions((current) =>
                                      current.map((item) =>
                                        item === relationship
                                          ? {
                                              ...item,
                                              rationale: event.target.value,
                                            }
                                          : item,
                                      ),
                                    )
                                  }
                                />
                              </label>
                              <button
                                type="button"
                                className="text-button"
                                onClick={() => {
                                  setRelationshipSuggestions((current) =>
                                    current.filter(
                                      (item) => item !== relationship,
                                    ),
                                  );
                                  setApprovedRelationships((current) => {
                                    const next = new Set(current);
                                    next.delete(key);
                                    return next;
                                  });
                                }}
                              >
                                Remove connection
                              </button>
                            </span>
                          </label>
                        );
                      })
                    ) : (
                      <p className="empty compact-empty">
                        No connection proposals are loaded yet. Run Enrich
                        question to compare this question with the published
                        catalogue.
                      </p>
                    )}
                  </section>
                  <fieldset>
                    <legend>Classification</legend>
                    <label>
                      Category
                      <select
                        value={editorCategoryId}
                        onChange={(event) =>
                          setEditorCategoryId(event.target.value)
                        }
                      >
                        {editing.categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </fieldset>
                  <fieldset id="quality-summary">
                    <legend>Context summary</legend>
                    <label>
                      Encyclopedic overview
                      <textarea
                        required
                        minLength={150}
                        rows={7}
                        value={editorContext}
                        onChange={(event) =>
                          setEditorContext(event.target.value)
                        }
                        placeholder="At least 150 answer-free characters describing the question's history, framing, and significance."
                      />
                      <small>
                        {countWords(editorContext)}/60 words · at least 150
                        characters and no more than 60 words
                      </small>
                    </label>
                  </fieldset>
                  <fieldset id="quality-terms">
                    <legend>Terms that shape the question</legend>
                    <p>
                      Define only vocabulary that materially changes how this
                      particular question is understood. Leave this empty when
                      no useful terms are ready.
                    </p>
                    {editorKeyTerms.map((item, index) => (
                      <div className="timeline-editor-event" key={index}>
                        <label>
                          Term
                          <input
                            required
                            minLength={2}
                            maxLength={80}
                            value={item.term}
                            onChange={(event) =>
                              setEditorKeyTerms((current) =>
                                current.map((term, position) =>
                                  position === index
                                    ? { ...term, term: event.target.value }
                                    : term,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          Concrete meaning in this question
                          <textarea
                            required
                            minLength={80}
                            rows={4}
                            value={item.description}
                            onChange={(event) =>
                              setEditorKeyTerms((current) =>
                                current.map((term, position) =>
                                  position === index
                                    ? {
                                        ...term,
                                        description: event.target.value,
                                      }
                                    : term,
                                ),
                              )
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="text-link"
                          onClick={() =>
                            setEditorKeyTerms((current) =>
                              current.filter(
                                (_, position) => position !== index,
                              ),
                            )
                          }
                        >
                          Remove term
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="button ghost small"
                      disabled={editorKeyTerms.length >= 8}
                      onClick={() =>
                        setEditorKeyTerms((current) => [
                          ...current,
                          { term: "", description: "" },
                        ])
                      }
                    >
                      Add key term
                    </button>
                  </fieldset>
                  <fieldset>
                    <legend>People associated with the inquiry</legend>
                    <p>
                      Include people whose documented work materially changed
                      how this question was framed, investigated, or debated.
                    </p>
                    {editorPeople.map((person, index) => (
                      <div className="timeline-editor-event" key={index}>
                        <label>
                          Name
                          <input
                            required
                            minLength={3}
                            value={person.name}
                            onChange={(event) =>
                              setEditorPeople((current) =>
                                current.map((item, position) =>
                                  position === index
                                    ? { ...item, name: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          Life or active period
                          <input
                            required
                            value={person.period}
                            placeholder="For example: 1842–1910"
                            onChange={(event) =>
                              setEditorPeople((current) =>
                                current.map((item, position) =>
                                  position === index
                                    ? { ...item, period: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          Specific association with this question
                          <textarea
                            required
                            minLength={60}
                            rows={4}
                            value={person.association}
                            onChange={(event) =>
                              setEditorPeople((current) =>
                                current.map((item, position) =>
                                  position === index
                                    ? {
                                        ...item,
                                        association: event.target.value,
                                      }
                                    : item,
                                ),
                              )
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="text-link"
                          onClick={() =>
                            setEditorPeople((current) =>
                              current.filter(
                                (_, position) => position !== index,
                              ),
                            )
                          }
                        >
                          Remove person
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="button ghost small"
                      disabled={editorPeople.length >= 12}
                      onClick={() =>
                        setEditorPeople((current) => [
                          ...current,
                          { name: "", period: "", association: "" },
                        ])
                      }
                    >
                      Add person
                    </button>
                  </fieldset>
                  <fieldset id="quality-timeline">
                    <legend>How the asking changed</legend>
                    <p>
                      Build the chronological history shown on the public
                      question page. Record changes in framing, vocabulary,
                      audience, or method—never an answer.
                    </p>
                    {editorTimeline.map((event, index) => (
                      <div className="timeline-editor-event" key={index}>
                        <label>
                          Date or period
                          <input
                            required
                            value={event.displayDate}
                            placeholder="For example: 1970s"
                            onChange={(change) =>
                              setEditorTimeline((current) =>
                                current.map((item, position) =>
                                  position === index
                                    ? {
                                        ...item,
                                        displayDate: change.target.value,
                                      }
                                    : item,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          Milestone title
                          <input
                            required
                            minLength={4}
                            value={event.title}
                            onChange={(change) =>
                              setEditorTimeline((current) =>
                                current.map((item, position) =>
                                  position === index
                                    ? { ...item, title: change.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          What changed in the asking
                          <textarea
                            required
                            minLength={60}
                            rows={4}
                            value={event.description}
                            onChange={(change) =>
                              setEditorTimeline((current) =>
                                current.map((item, position) =>
                                  position === index
                                    ? {
                                        ...item,
                                        description: change.target.value,
                                      }
                                    : item,
                                ),
                              )
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="text-link"
                          onClick={() =>
                            setEditorTimeline((current) =>
                              current.filter(
                                (_, position) => position !== index,
                              ),
                            )
                          }
                        >
                          Remove event
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="button ghost small"
                      onClick={() =>
                        setEditorTimeline((current) => [
                          ...current,
                          { displayDate: "", title: "", description: "" },
                        ])
                      }
                    >
                      Add timeline event
                    </button>
                  </fieldset>
                  <fieldset id="answer-attempt-editor">
                    <legend>Attempts to answer this question</legend>
                    <p>
                      For Open and Partially answered questions, review works
                      that investigated or proposed answers over time. Approval
                      publishes only the editorial description—not the answer.
                      AI suggestions may omit a URL; add and verify a credible
                      HTTPS source before approving them.
                    </p>
                    {editorAnswerAttempts.map((attempt, index) => (
                      <article className="answer-attempt-editor" key={index}>
                        <label className="answer-attempt-approval">
                          <input
                            type="checkbox"
                            checked={attempt.approved}
                            onChange={(event) =>
                              setEditorAnswerAttempts((current) =>
                                current.map((item, position) =>
                                  position === index
                                    ? {
                                        ...item,
                                        approved: event.target.checked,
                                      }
                                    : item,
                                ),
                              )
                            }
                          />
                          Approve this source for publication
                        </label>
                        {(
                          [
                            ["title", "Source title"],
                            ["author", "Author"],
                            ["publisher", "Publisher"],
                            ["publicationDate", "Publication date or period"],
                            ["url", "HTTPS source URL"],
                          ] as const
                        ).map(([field, label]) => (
                          <label key={field}>
                            {label}
                            <input
                              required={
                                attempt.approved &&
                                (field === "title" || field === "url")
                              }
                              type={field === "url" ? "url" : "text"}
                              value={attempt[field]}
                              onChange={(event) =>
                                setEditorAnswerAttempts((current) =>
                                  current.map((item, position) =>
                                    position === index
                                      ? { ...item, [field]: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                            />
                          </label>
                        ))}
                        {(
                          [
                            ["approach", "Approach taken"],
                            ["scope", "Part of the question addressed"],
                            ["significance", "Historical significance"],
                            ["unresolved", "What remained unresolved"],
                          ] as const
                        ).map(([field, label]) => (
                          <label key={field}>
                            {label}
                            <textarea
                              required={attempt.approved}
                              minLength={30}
                              rows={3}
                              value={attempt[field]}
                              onChange={(event) =>
                                setEditorAnswerAttempts((current) =>
                                  current.map((item, position) =>
                                    position === index
                                      ? { ...item, [field]: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                            />
                          </label>
                        ))}
                        <button
                          type="button"
                          className="text-link"
                          onClick={() =>
                            setEditorAnswerAttempts((current) =>
                              current.filter(
                                (_, position) => position !== index,
                              ),
                            )
                          }
                        >
                          Remove source
                        </button>
                      </article>
                    ))}
                    <button
                      type="button"
                      className="button ghost small"
                      onClick={() =>
                        setEditorAnswerAttempts((current) => [
                          ...current,
                          {
                            approved: false,
                            title: "",
                            author: "",
                            publisher: "",
                            url: "",
                            publicationDate: "",
                            approach: "",
                            scope: "",
                            significance: "",
                            unresolved: "",
                          },
                        ])
                      }
                    >
                      Add answer attempt
                    </button>
                  </fieldset>
                  {editorSections.map((section, index) => (
                    <fieldset
                      key={`${section.key}-${index}`}
                      id={index === 0 ? "quality-story" : undefined}
                    >
                      <legend>Section {index + 1}</legend>
                      <label>
                        Kicker
                        <input
                          required
                          value={section.kicker}
                          onChange={(event) =>
                            updateSection(index, "kicker", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        Title
                        <input
                          required
                          minLength={4}
                          value={section.title}
                          onChange={(event) =>
                            updateSection(index, "title", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        Core paragraph
                        <textarea
                          required
                          minLength={80}
                          rows={6}
                          value={section.paragraphs[0] ?? ""}
                          onChange={(event) =>
                            updateSection(
                              index,
                              "paragraph",
                              event.target.value,
                            )
                          }
                          placeholder="At least 80 characters of historical or contextual material that does not resolve the question."
                        />
                      </label>
                      <div className="block-editor-list">
                        {(section.blocks ?? []).map((block, blockIndex) =>
                          block.type === "PARAGRAPH" &&
                          blockIndex === 0 ? null : (
                            <RichBlockFields
                              key={blockIndex}
                              block={block}
                              onChange={(value) =>
                                replaceBlock(index, blockIndex, value)
                              }
                              onRemove={() => removeBlock(index, blockIndex)}
                            />
                          ),
                        )}
                      </div>
                      <div className="add-block">
                        <span>Enrich section:</span>
                        {(
                          [
                            "HEADING",
                            "IMAGE",
                            "TABLE",
                            "LIST",
                            "QUOTE",
                            "CALLOUT",
                          ] as StoryBlock["type"][]
                        ).map((type) => (
                          <button
                            type="button"
                            key={type}
                            onClick={() => addBlock(index, type)}
                          >
                            + {type.toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                  <div className="story-editor-controls">
                    <button
                      type="button"
                      className="button ghost small"
                      onClick={() =>
                        setEditorSections((current) => [
                          ...current,
                          {
                            key: `section-${current.length + 1}`,
                            kicker: "Context",
                            title: "",
                            paragraphs: [""],
                          },
                        ])
                      }
                    >
                      Add section
                    </button>
                    <span>
                      {editing.publication_state === "DRAFT" && (
                        <select
                          id="quality-status"
                          aria-label="Verified answer status"
                          value={editorVerifiedStatus}
                          onChange={(event) =>
                            setEditorVerifiedStatus(event.target.value)
                          }
                        >
                          <option value="OPEN">Open</option>
                          <option value="PARTIALLY_ANSWERED">
                            Partially answered
                          </option>
                          <option value="ANSWERED">Answered</option>
                        </select>
                      )}
                      {editing.publication_state === "PUBLISHED" && (
                        <button
                          className="button ghost small"
                          type="button"
                          disabled={busy}
                          onClick={() => void discardRevision()}
                        >
                          Discard
                        </button>
                      )}
                      <button className="button small" disabled={busy}>
                        {editing.publication_state === "DRAFT"
                          ? "Save Story"
                          : "Save revision"}
                      </button>
                      {editing.publication_state === "DRAFT" && (
                        <>
                          <button
                            className="button small publish-revision"
                            type="button"
                            disabled={busy || !workingQuality?.ready}
                            onClick={() => void saveAndPublish()}
                          >
                            Save &amp; publish
                          </button>
                          <button
                            className="button small"
                            type="button"
                            disabled={
                              busy ||
                              !workingQuality?.ready ||
                              filteredQuestions.length < 2
                            }
                            onClick={() => void saveAndPublish(true)}
                          >
                            Approve &amp; open next
                          </button>
                        </>
                      )}
                      {editing.publication_state === "PUBLISHED" &&
                        editing.hasPendingRevision && (
                          <button
                            className="button small publish-revision"
                            type="button"
                            disabled={busy || !workingQuality?.ready}
                            onClick={() => void publishRevision()}
                          >
                            Publish revision
                          </button>
                        )}
                    </span>
                  </div>
                  {editing.revisions.length > 0 && (
                    <small>
                      {editing.revisions.length} recent revision event
                      {editing.revisions.length === 1 ? "" : "s"} retained.
                    </small>
                  )}
                </form>
              )}
              {filteredQuestions.map((question) => (
                <article
                  key={question.id}
                  className={`editorial-record ${question.publication_state.toLowerCase()}`}
                >
                  <div>
                    <span>
                      {question.submission_state ?? question.publication_state}
                    </span>
                    <small>
                      {question.category_name} · {question.section_count} Story
                      section{question.section_count === 1 ? "" : "s"}
                    </small>
                  </div>
                  <h3>{question.question_text}</h3>
                  <p>{question.context_summary}</p>
                  <div className="quality-indicators" aria-label="Editorial completeness">
                    {qualityChecks(question).map((check) => (
                      <span key={check.key} className={check.pass ? "quality-pass" : "quality-missing"}>
                        {check.pass ? "✓" : "○"} {check.label}
                      </span>
                    ))}
                  </div>
                  {question.publication_state === "DRAFT" ? (
                    <div className="editorial-actions">
                      {question.submission_state && (
                        <a
                          className="button ghost small"
                          href={`/editorial/submissions/${question.id}`}
                        >
                          Review submission
                        </a>
                      )}
                      <button
                        className="button ghost small"
                        type="button"
                        disabled={busy}
                        onClick={() => void openEditor(question)}
                      >
                        Edit Story
                      </button>
                      {question.submission_state === "SUBMITTED" && (
                        <>
                          <button
                            className="button ghost small"
                            type="button"
                            disabled={busy}
                            onClick={() => void requestChanges(question)}
                          >
                            Request changes
                          </button>
                          <button
                            className="button ghost small reject-action"
                            type="button"
                            disabled={busy}
                            onClick={() => void rejectQuestion(question)}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <select
                        aria-label={`Verified status for ${question.question_text}`}
                        defaultValue={question.claimed_status}
                        id={`status-${question.id}`}
                      >
                        <option value="OPEN">Open</option>
                        <option value="PARTIALLY_ANSWERED">
                          Partially answered
                        </option>
                        <option value="ANSWERED">Answered</option>
                      </select>
                      <button
                        className="button small"
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const select = document.getElementById(
                            `status-${question.id}`,
                          ) as HTMLSelectElement;
                          void publish(question, select.value);
                        }}
                      >
                        Review & publish
                      </button>
                    </div>
                  ) : (
                    <div className="editorial-actions">
                      <button
                        className="button ghost small"
                        type="button"
                        disabled={busy}
                        onClick={() => void openEditor(question)}
                      >
                        Review Story
                      </button>
                      <a
                        className="button small"
                        href={`/questions/${question.slug}`}
                      >
                        View live
                      </a>
                    </div>
                  )}
                </article>
              ))}
              {!editing && filteredQuestions.length === 0 && (
                <div className="empty compact-empty">
                  <strong>No editorial questions match.</strong>
                  <p>Try fewer words, remove a filter, or search by category or slug.</p>
                </div>
              )}
            </section>
          </div>
        </>
      )}
      {connected && workspaceMode === "review" && questions.length === 0 && (
        <div className="empty">
          <h2>
            {scope === "review"
              ? "No publisher submissions are awaiting review."
              : "The archive is empty."}
          </h2>
          <p>
            {scope === "review"
              ? "Saved drafts remain private until the publisher selects Submit for review. Use Refresh after they submit."
              : "Published and legacy editorial questions appear here."}
          </p>
        </div>
      )}
    </div>
  );
}
