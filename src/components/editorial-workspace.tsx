"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { StoryBlock } from "@/domain/question";
import type { EnrichmentProposal } from "@/domain/enrichment";
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
type EditorialDetail = EditorialQuestion & {
  sections: StoryEditorSection[];
  liveSections: StoryEditorSection[];
  hasPendingRevision: boolean;
  revisionDraftUpdatedAt: string | null;
  revisions: { id: string; action: string; created_at: string }[];
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
  const [previewStory, setPreviewStory] = useState(false);
  const [proposal, setProposal] = useState<EnrichmentProposal | null>(null);
  const [approvedRelationships, setApprovedRelationships] = useState<
    Set<string>
  >(new Set());
  const [scope, setScope] = useState<"review" | "archive">("review");
  const [reviewCount, setReviewCount] = useState(0);

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
        reviewCount?: number;
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
      const result = await api(`/api/editorial/questions?scope=${scope}`);
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
  }, [api, token, scope]);

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
      setEditorSections(detail.sections.length ? detail.sections : defaults);
      setPreviewStory(false);
      setApprovedRelationships(new Set());
      setProposal(null);
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

  async function enrichStory() {
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
        { method: "POST" },
      );
      if (!result.proposal)
        throw new Error("The enrichment service returned no proposal.");
      setProposal(result.proposal);
      setApprovedRelationships(new Set());
      setEditorContext(result.proposal.contextSummary);
      setEditorSections(result.proposal.sections);
      setMessage(
        "Proposal ready for editorial review. Verify its claims and sources, edit it, then save the private revision.",
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
          sections: editorSections,
          relationships:
            proposal?.relationships.filter((relationship) =>
              approvedRelationships.has(
                `${relationship.targetId}:${relationship.type}`,
              ),
            ) ?? [],
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
          sections: editorSections,
          relationships:
            proposal?.relationships.filter((relationship) =>
              approvedRelationships.has(
                `${relationship.targetId}:${relationship.type}`,
              ),
            ) ?? [],
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
            className={scope === "review" ? "active" : ""}
            onClick={() => setScope("review")}
          >
            Review queue <span>{reviewCount}</span>
          </button>
          <button
            type="button"
            className={scope === "archive" ? "active" : ""}
            onClick={() => setScope("archive")}
          >
            Question archive
          </button>
          <button type="button" onClick={() => void load()} disabled={busy}>
            Refresh
          </button>
        </nav>
      )}
      {questions.length > 0 && (
        <>
          <div className="editorial-grid">
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
                    </section>
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
                      <small>{proposal.warnings.join(" ")}</small>
                    </aside>
                  )}
                  {proposal && (
                    <section className="relationship-proposals">
                      <div>
                        <span className="eyebrow">Question graph</span>
                        <h4>Approve proposed connections</h4>
                        <p>
                          Suggestions are unchecked by default. Only selected
                          relationships are saved to the navigable question map.
                        </p>
                      </div>
                      {proposal.relationships.length ? (
                        proposal.relationships.map((relationship) => {
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
                              </span>
                            </label>
                          );
                        })
                      ) : (
                        <p className="empty compact-empty">
                          No defensible connections were proposed from the
                          current catalogue.
                        </p>
                      )}
                    </section>
                  )}
                  <fieldset>
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
                        {editorContext.length} characters · required before
                        publication
                      </small>
                    </label>
                  </fieldset>
                  {editorSections.map((section, index) => (
                    <fieldset key={`${section.key}-${index}`}>
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
                        Save revision
                      </button>
                      {editing.publication_state === "PUBLISHED" &&
                        editing.hasPendingRevision && (
                          <button
                            className="button small publish-revision"
                            type="button"
                            disabled={busy}
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
              {questions.map((question) => (
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
            </section>
          </div>
        </>
      )}
      {connected && questions.length === 0 && (
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
