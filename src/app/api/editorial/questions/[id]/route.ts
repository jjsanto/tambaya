import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  countWords,
  hasLikelyAnswerLeak,
  isAnswerStatus,
  isRelationshipType,
  type RelationshipType,
  type StoryBlock,
} from "@/domain/question";
import {
  editorialHeaders,
  hasEditorialAccess,
  unauthorized,
} from "@/lib/editorial-auth";
import type { CloudflareBindings } from "@/types/cloudflare";
import { eventStatement } from "@/lib/submission-events";
import { isUsefulKeyTermDescription } from "@/domain/enrichment";

type DraftRow = {
  id: string;
  question_text: string;
  context_summary: string;
  category_id: string;
  publication_state: string;
  submission_state: string | null;
  editorial_outcome: string | null;
};
type SectionRow = {
  id: string;
  section_key: string;
  kicker: string;
  title: string;
  position: number;
};
type ParagraphRow = { section_id: string; body: string; position: number };
type BlockRow = {
  section_id: string;
  block_type: StoryBlock["type"];
  data_json: string;
  position: number;
};
type TimelineRow = {
  display_date: string;
  title: string;
  description: string;
  position: number;
};
type EditableTimelineEvent = {
  displayDate: string;
  title: string;
  description: string;
};
type EditableAnswerAttempt = {
  title: string;
  author: string;
  publisher: string;
  url: string;
  publicationDate: string;
  approach: string;
  scope: string;
  significance: string;
  unresolved: string;
};
type EditableKeyTerm = { term: string; description: string };
type AnswerAttemptRow = Omit<
  EditableAnswerAttempt,
  "url" | "publicationDate"
> & {
  source_url: string;
  publication_date: string;
};
type RevisionRow = { id: string; action: string; created_at: string };
type RevisionDraftRow = {
  snapshot_json: string;
  created_at: string;
  updated_at: string;
};
type EditableSection = {
  key: string;
  kicker: string;
  title: string;
  paragraphs: string[];
  blocks?: StoryBlock[];
};
type ApprovedRelationship = {
  targetId: string;
  targetSlug: string;
  type: RelationshipType;
  confidence: number;
  rationale: string;
};
type RelationshipRow = {
  targetId: string;
  targetSlug: string;
  targetQuestion: string;
  type: RelationshipType;
  confidence: number;
  verified: number;
  rationale: string;
};
type CandidateQuestion = {
  id: string;
  slug: string;
  questionText: string;
  category: string;
};

function normalizeBlocks(value: unknown): StoryBlock[] | null {
  if (!Array.isArray(value) || value.length > 40) return null;
  const output: StoryBlock[] = [];
  for (const item of value) {
    const block = item as Record<string, unknown>;
    const type = String(block.type ?? "");
    if (
      type === "PARAGRAPH" ||
      type === "HEADING" ||
      type === "QUOTE" ||
      type === "CALLOUT"
    ) {
      const text = String(block.text ?? "").trim();
      if (!text || hasLikelyAnswerLeak(text)) return null;
      if (type === "PARAGRAPH") output.push({ type, text });
      else if (type === "HEADING")
        output.push({ type, text, level: block.level === 4 ? 4 : 3 });
      else if (type === "QUOTE")
        output.push({
          type,
          text,
          attribution: String(block.attribution ?? "").trim() || undefined,
          sourceUrl: String(block.sourceUrl ?? "").trim() || undefined,
        });
      else
        output.push({
          type,
          text,
          title: String(block.title ?? "").trim() || undefined,
          tone: ["NOTE", "CONTEXT", "CAUTION"].includes(String(block.tone))
            ? (block.tone as "NOTE" | "CONTEXT" | "CAUTION")
            : "NOTE",
        });
    } else if (type === "IMAGE") {
      const src = String(block.src ?? "").trim();
      const alt = String(block.alt ?? "").trim();
      if ((!src.startsWith("/") && !/^https:\/\//i.test(src)) || !alt)
        return null;
      output.push({
        type,
        src,
        alt,
        caption: String(block.caption ?? "").trim() || undefined,
        credit: String(block.credit ?? "").trim() || undefined,
        sourceUrl: String(block.sourceUrl ?? "").trim() || undefined,
      });
    } else if (type === "LIST") {
      const items = Array.isArray(block.items)
        ? block.items
            .map(String)
            .map((text) => text.trim())
            .filter(Boolean)
        : [];
      if (!items.length || items.some(hasLikelyAnswerLeak)) return null;
      output.push({
        type,
        style: block.style === "ORDERED" ? "ORDERED" : "UNORDERED",
        items,
      });
    } else if (type === "TABLE") {
      const headers = Array.isArray(block.headers)
        ? block.headers.map(String).map((text) => text.trim())
        : [];
      const rows = Array.isArray(block.rows)
        ? block.rows.map((row) =>
            Array.isArray(row)
              ? row.map(String).map((text) => text.trim())
              : [],
          )
        : [];
      if (
        !headers.length ||
        headers.length > 12 ||
        !rows.length ||
        rows.length > 100 ||
        rows.some((row) => row.length !== headers.length) ||
        [...headers, ...rows.flat()].some(hasLikelyAnswerLeak)
      )
        return null;
      output.push({
        type,
        caption: String(block.caption ?? "").trim() || undefined,
        headers,
        rows,
      });
    } else return null;
  }
  return output;
}

async function runtime() {
  return (await getCloudflareContext({ async: true })) as unknown as {
    env: CloudflareBindings;
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { env } = await runtime();
  if (!(await hasEditorialAccess(request, env))) return unauthorized();
  const { id } = await params;
  const question = await env.DB.prepare(
    "SELECT id,question_text,context_summary,category_id,publication_state,submission_state,editorial_outcome FROM questions WHERE id=?",
  )
    .bind(id)
    .first<DraftRow>();
  if (!question)
    return Response.json({ error: "Question not found." }, { status: 404 });
  const [
    sectionsResult,
    paragraphsResult,
    blocksResult,
    revisionsResult,
    revisionDraft,
    relationshipsResult,
    candidatesResult,
    categoriesResult,
    timelineResult,
    keyTermsResult,
    answerAttemptsResult,
  ] = await Promise.all([
    env.DB.prepare(
      "SELECT id,section_key,kicker,title,position FROM question_story_sections WHERE question_id=? ORDER BY position",
    )
      .bind(id)
      .all<SectionRow>(),
    env.DB.prepare(
      "SELECT p.section_id,p.body,p.position FROM question_story_paragraphs p JOIN question_story_sections s ON s.id=p.section_id WHERE s.question_id=? ORDER BY s.position,p.position",
    )
      .bind(id)
      .all<ParagraphRow>(),
    env.DB.prepare(
      "SELECT b.section_id,b.block_type,b.data_json,b.position FROM question_story_blocks b JOIN question_story_sections s ON s.id=b.section_id WHERE s.question_id=? ORDER BY s.position,b.position",
    )
      .bind(id)
      .all<BlockRow>(),
    env.DB.prepare(
      "SELECT id,action,created_at FROM editorial_revisions WHERE question_id=? ORDER BY created_at DESC LIMIT 12",
    )
      .bind(id)
      .all<RevisionRow>(),
    env.DB.prepare(
      "SELECT snapshot_json,created_at,updated_at FROM question_revision_drafts WHERE question_id=?",
    )
      .bind(id)
      .first<RevisionDraftRow>(),
    env.DB.prepare(
      "SELECT r.target_question_id targetId,r.target_slug targetSlug,q.question_text targetQuestion,r.relationship_type type,COALESCE(r.confidence,0) confidence,r.verified,COALESCE(r.rationale,'') rationale FROM question_relationships r JOIN questions q ON q.id=r.target_question_id WHERE r.source_question_id=? AND r.created_by='AI_ASSISTED' ORDER BY r.verified DESC,r.confidence DESC",
    )
      .bind(id)
      .all<RelationshipRow>(),
    env.DB.prepare(
      "SELECT id,slug,question_text questionText,category_name category FROM questions WHERE id<>? AND publication_state='PUBLISHED' ORDER BY question_text LIMIT 500",
    )
      .bind(id)
      .all<CandidateQuestion>(),
    env.DB.prepare("SELECT id,name FROM categories ORDER BY name").all<{
      id: string;
      name: string;
    }>(),
    env.DB.prepare(
      "SELECT display_date,title,description,position FROM timeline_events WHERE question_id=? ORDER BY position",
    )
      .bind(id)
      .all<TimelineRow>(),
    env.DB.prepare(
      "SELECT term,description FROM question_key_terms WHERE question_id=? ORDER BY position",
    ).bind(id).all<EditableKeyTerm>(),
    env.DB.prepare(
      "SELECT title,author,publisher,source_url,publication_date,approach,scope,significance,unresolved FROM question_answer_attempts WHERE question_id=? AND verified=1 ORDER BY position",
    )
      .bind(id)
      .all<AnswerAttemptRow>(),
  ]);
  const paragraphs = paragraphsResult.results ?? [];
  const blocks = blocksResult.results ?? [];
  const liveSections = (sectionsResult.results ?? []).map((section) => ({
    key: section.section_key,
    kicker: section.kicker,
    title: section.title,
    paragraphs: paragraphs
      .filter((item) => item.section_id === section.id)
      .map((item) => item.body),
    blocks: blocks
      .filter((item) => item.section_id === section.id)
      .map(
        (item) =>
          ({
            type: item.block_type,
            ...JSON.parse(item.data_json),
          }) as StoryBlock,
      ),
  }));
  const workingCopy = revisionDraft
    ? (JSON.parse(revisionDraft.snapshot_json) as {
        contextSummary?: string;
        categoryId?: string;
        sections?: EditableSection[];
        timeline?: EditableTimelineEvent[];
        keyTerms?: EditableKeyTerm[];
        answerAttempts?: EditableAnswerAttempt[];
      })
    : null;
  const workingSections = workingCopy?.sections?.map((section) => ({
    ...section,
    blocks: section.blocks?.length
      ? section.blocks
      : (liveSections.find((live) => live.key === section.key)?.blocks ??
        section.paragraphs.map((text) => ({
          type: "PARAGRAPH" as const,
          text,
        }))),
  }));
  return Response.json(
    {
      question: {
        ...question,
        context_summary:
          workingCopy?.contextSummary ?? question.context_summary,
        category_id: workingCopy?.categoryId ?? question.category_id,
        categories: categoriesResult.results ?? [],
        sections: workingSections ?? liveSections,
        timeline:
          workingCopy?.timeline ??
          (timelineResult.results ?? []).map((event) => ({
            displayDate: event.display_date,
            title: event.title,
            description: event.description,
          })),
        keyTerms: workingCopy?.keyTerms ?? keyTermsResult.results ?? [],
        answerAttempts:
          workingCopy?.answerAttempts ??
          (answerAttemptsResult.results ?? []).map((attempt) => ({
            title: attempt.title,
            author: attempt.author,
            publisher: attempt.publisher,
            url: attempt.source_url,
            publicationDate: attempt.publication_date,
            approach: attempt.approach,
            scope: attempt.scope,
            significance: attempt.significance,
            unresolved: attempt.unresolved,
          })),
        liveSections,
        candidates: candidatesResult.results ?? [],
        relationships: (relationshipsResult.results ?? []).map(
          (relationship) => ({
            ...relationship,
            rationale: "Previously reviewed editorial connection.",
          }),
        ),
        hasPendingRevision: !!revisionDraft,
        revisionDraftUpdatedAt: revisionDraft?.updated_at ?? null,
        revisions: revisionsResult.results ?? [],
      },
    },
    { headers: editorialHeaders },
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { env } = await runtime();
  if (!(await hasEditorialAccess(request, env))) return unauthorized();
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const draft = await env.DB.prepare(
    "SELECT id,question_text,context_summary,category_id,publication_state,submission_state,editorial_outcome FROM questions WHERE id=?",
  )
    .bind(id)
    .first<DraftRow>();
  if (!draft)
    return Response.json({ error: "Question not found." }, { status: 404 });
  if (body.action === "request_changes") {
    if (draft.submission_state !== "SUBMITTED" || draft.editorial_outcome)
      return Response.json(
        {
          error: "Only active submitted questions can be returned for changes.",
        },
        { status: 409 },
      );
    const reviewNotes = String(body.reviewNotes ?? "").trim();
    if (reviewNotes.length < 10 || reviewNotes.length > 1000)
      return Response.json(
        { error: "Give the publisher a useful note of 10–1000 characters." },
        { status: 400 },
      );
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE questions SET submission_state='CHANGES_REQUESTED',review_notes=?,reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      ).bind(reviewNotes, id),
      eventStatement(env.DB, id, "EDITORIAL", "CHANGES_REQUESTED", reviewNotes),
    ]);
    return Response.json({ id, submissionState: "CHANGES_REQUESTED" });
  }
  if (body.action === "reject") {
    if (draft.submission_state !== "SUBMITTED" || draft.editorial_outcome)
      return Response.json(
        { error: "Only active submitted questions can be rejected." },
        { status: 409 },
      );
    const reviewNotes = String(body.reviewNotes ?? "").trim();
    if (reviewNotes.length < 10 || reviewNotes.length > 1000)
      return Response.json(
        {
          error:
            "Give the publisher a clear rejection reason of 10–1000 characters.",
        },
        { status: 400 },
      );
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE questions SET editorial_outcome='REJECTED',publication_state='ARCHIVED',visibility='PRIVATE',review_notes=?,reviewed_at=CURRENT_TIMESTAMP,rejected_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      ).bind(reviewNotes, id),
      eventStatement(env.DB, id, "EDITORIAL", "REJECTED", reviewNotes),
    ]);
    return Response.json({ id, submissionState: "REJECTED" });
  }
  if (body.action === "begin_revision") {
    if (draft.publication_state !== "PUBLISHED")
      return Response.json(
        { error: "Only published questions need a separate revision copy." },
        { status: 409 },
      );
    const existingDraft = await env.DB.prepare(
      "SELECT question_id FROM question_revision_drafts WHERE question_id=?",
    )
      .bind(id)
      .first<{ question_id: string }>();
    if (!existingDraft) {
      const sectionsResult = await env.DB.prepare(
        "SELECT id,section_key,kicker,title FROM question_story_sections WHERE question_id=? ORDER BY position",
      )
        .bind(id)
        .all<SectionRow>();
      const paragraphsResult = await env.DB.prepare(
        "SELECT p.section_id,p.body FROM question_story_paragraphs p JOIN question_story_sections s ON s.id=p.section_id WHERE s.question_id=? ORDER BY s.position,p.position",
      )
        .bind(id)
        .all<ParagraphRow>();
      const blocksResult = await env.DB.prepare(
        "SELECT b.section_id,b.block_type,b.data_json,b.position FROM question_story_blocks b JOIN question_story_sections s ON s.id=b.section_id WHERE s.question_id=? ORDER BY s.position,b.position",
      )
        .bind(id)
        .all<BlockRow>();
      const paragraphs = paragraphsResult.results ?? [];
      const blocks = blocksResult.results ?? [];
      const sections = (sectionsResult.results ?? []).map((section) => ({
        key: section.section_key,
        kicker: section.kicker,
        title: section.title,
        paragraphs: paragraphs
          .filter((item) => item.section_id === section.id)
          .map((item) => item.body),
        blocks: blocks
          .filter((item) => item.section_id === section.id)
          .map(
            (item) =>
              ({
                type: item.block_type,
                ...JSON.parse(item.data_json),
              }) as StoryBlock,
          ),
      }));
      await env.DB.prepare(
        "INSERT INTO question_revision_drafts (question_id,snapshot_json) VALUES (?,?)",
      )
        .bind(
          id,
          JSON.stringify({
            questionText: draft.question_text,
            contextSummary: draft.context_summary,
            categoryId: draft.category_id,
            sections,
            timeline:
              (
                await env.DB.prepare(
                  "SELECT display_date displayDate,title,description FROM timeline_events WHERE question_id=? ORDER BY position",
                )
                  .bind(id)
                  .all<EditableTimelineEvent>()
              ).results ?? [],
            keyTerms:
              (
                await env.DB.prepare(
                  "SELECT term,description FROM question_key_terms WHERE question_id=? ORDER BY position",
                ).bind(id).all<EditableKeyTerm>()
              ).results ?? [],
            answerAttempts:
              (
                await env.DB.prepare(
                  "SELECT title,author,publisher,source_url url,publication_date publicationDate,approach,scope,significance,unresolved FROM question_answer_attempts WHERE question_id=? AND verified=1 ORDER BY position",
                )
                  .bind(id)
                  .all<EditableAnswerAttempt>()
              ).results ?? [],
          }),
        )
        .run();
    }
    return Response.json({ id, revisionState: "DRAFT" });
  }
  if (body.action === "discard_revision") {
    await env.DB.prepare(
      "DELETE FROM question_revision_drafts WHERE question_id=?",
    )
      .bind(id)
      .run();
    return Response.json({ id, revisionState: "DISCARDED" });
  }
  if (body.action === "save_story" || body.action === "save_revision") {
    const isPublishedRevision = draft.publication_state === "PUBLISHED";
    if (isPublishedRevision && body.action !== "save_revision")
      return Response.json(
        { error: "Published Stories require a revision copy." },
        { status: 409 },
      );
    if (!isPublishedRevision && draft.publication_state !== "DRAFT")
      return Response.json(
        { error: "This record cannot be edited." },
        { status: 409 },
      );
    const contextSummary = String(body.contextSummary ?? "").trim();
    if (
      contextSummary.length < 150 ||
      countWords(contextSummary) > 60 ||
      hasLikelyAnswerLeak(contextSummary)
    )
      return Response.json(
        {
          error:
            "The context summary must contain at least 150 characters, remain answer-free, and use no more than 60 words.",
        },
        { status: 400 },
      );
    const categoryId = String(body.categoryId ?? "").trim();
    const category = await env.DB.prepare(
      "SELECT id,name FROM categories WHERE id=?",
    )
      .bind(categoryId)
      .first<{ id: string; name: string }>();
    if (!category)
      return Response.json(
        { error: "Choose a valid question category." },
        { status: 400 },
      );
    const requestedRelationships = Array.isArray(body.relationships)
      ? body.relationships.slice(0, 8)
      : [];
    const relationships: ApprovedRelationship[] = [];
    if (!Array.isArray(body.keyTerms) || body.keyTerms.length > 8)
      return Response.json(
        { error: "Provide up to eight question-specific key terms." },
        { status: 400 },
      );
    const keyTerms: EditableKeyTerm[] = [];
    for (const [position, raw] of body.keyTerms.entries()) {
      const item = raw as Record<string, unknown>;
      const term = String(item.term ?? "").trim();
      const description = String(item.description ?? "").trim();
      if (
        term.length < 2 ||
        term.length > 80 ||
        !isUsefulKeyTermDescription(description)
      )
        return Response.json(
          {
            error: `Key term ${position + 1} needs a concrete, question-specific definition of at least 80 characters.`,
          },
          { status: 400 },
        );
      keyTerms.push({ term, description });
    }
    if (
      new Set(keyTerms.map((item) => item.term.toLowerCase())).size !==
      keyTerms.length
    )
      return Response.json(
        { error: "Key terms must be unique." },
        { status: 400 },
      );
    if (!Array.isArray(body.answerAttempts) || body.answerAttempts.length > 10)
      return Response.json(
        { error: "Choose up to 10 verified answer attempts." },
        { status: 400 },
      );
    const answerAttempts: EditableAnswerAttempt[] = [];
    for (const [position, raw] of body.answerAttempts.entries()) {
      const attempt = raw as Record<string, unknown>;
      const item = {
        title: String(attempt.title ?? "").trim(),
        author: String(attempt.author ?? "").trim(),
        publisher: String(attempt.publisher ?? "").trim(),
        url: String(attempt.url ?? "").trim(),
        publicationDate: String(attempt.publicationDate ?? "").trim(),
        approach: String(attempt.approach ?? "").trim(),
        scope: String(attempt.scope ?? "").trim(),
        significance: String(attempt.significance ?? "").trim(),
        unresolved: String(attempt.unresolved ?? "").trim(),
      };
      if (
        !item.title ||
        !/^https:\/\//i.test(item.url) ||
        [item.approach, item.scope, item.significance, item.unresolved].some(
          (text) => text.length < 30 || hasLikelyAnswerLeak(text),
        )
      )
        return Response.json(
          {
            error: `Answer attempt ${position + 1} needs a credible HTTPS source and complete answer-free editorial notes.`,
          },
          { status: 400 },
        );
      answerAttempts.push(item);
    }
    if (!Array.isArray(body.timeline) || body.timeline.length > 12)
      return Response.json(
        {
          error: "The question history must be a timeline of up to 12 events.",
        },
        { status: 400 },
      );
    const timeline: EditableTimelineEvent[] = [];
    for (const [position, raw] of body.timeline.entries()) {
      const event = raw as Record<string, unknown>;
      const displayDate = String(event.displayDate ?? "").trim();
      const title = String(event.title ?? "").trim();
      const description = String(event.description ?? "").trim();
      if (
        !displayDate ||
        title.length < 4 ||
        description.length < 60 ||
        hasLikelyAnswerLeak(description)
      )
        return Response.json(
          {
            error: `Timeline event ${position + 1} needs a date, title, and at least 60 answer-free characters.`,
          },
          { status: 400 },
        );
      timeline.push({ displayDate, title, description });
    }
    for (const raw of requestedRelationships) {
      const item = raw as Record<string, unknown>;
      const targetId = String(item.targetId ?? "");
      const targetSlug = String(item.targetSlug ?? "");
      const type = item.type;
      const confidence = Number(item.confidence);
      const rationale = String(item.rationale ?? "")
        .trim()
        .slice(0, 1000);
      if (
        !targetId ||
        targetId === id ||
        !isRelationshipType(type) ||
        !Number.isFinite(confidence) ||
        confidence < 0 ||
        confidence > 1 ||
        rationale.length < 10
      )
        return Response.json(
          { error: "One proposed question relationship is invalid." },
          { status: 400 },
        );
      const target = await env.DB.prepare(
        "SELECT slug FROM questions WHERE id=? AND publication_state='PUBLISHED'",
      )
        .bind(targetId)
        .first<{ slug: string }>();
      if (!target || target.slug !== targetSlug)
        return Response.json(
          {
            error:
              "A proposed relationship no longer points to an available published question.",
          },
          { status: 400 },
        );
      relationships.push({ targetId, targetSlug, type, confidence, rationale });
    }
    if (
      !Array.isArray(body.sections) ||
      body.sections.length < 3 ||
      body.sections.length > 20
    )
      return Response.json(
        { error: "A Story requires between 3 and 20 sections." },
        { status: 400 },
      );
    for (const [position, value] of body.sections.entries()) {
      const section = value as Record<string, unknown>;
      const title = String(section.title ?? "").trim();
      const paragraphs = Array.isArray(section.paragraphs)
        ? section.paragraphs.map((item) => String(item).trim()).filter(Boolean)
        : [];
      const blocks =
        section.blocks === undefined
          ? paragraphs.map((text) => ({ type: "PARAGRAPH", text }))
          : normalizeBlocks(section.blocks);
      if (
        !String(section.kicker ?? "").trim() ||
        title.length < 4 ||
        paragraphs.length === 0 ||
        paragraphs.some(
          (paragraph) =>
            paragraph.length < 80 || hasLikelyAnswerLeak(paragraph),
        ) ||
        !blocks?.length
      )
        return Response.json(
          {
            error: `Section ${position + 1} needs a title, an answer-free paragraph of at least 80 characters, and valid content blocks.`,
          },
          { status: 400 },
        );
    }
    const sections = body.sections.map((value, position) => {
      const section = value as Record<string, unknown>;
      const kicker = String(section.kicker ?? "").trim();
      const title = String(section.title ?? "").trim();
      const paragraphs = Array.isArray(section.paragraphs)
        ? section.paragraphs.map((item) => String(item).trim()).filter(Boolean)
        : [];
      const blocks =
        normalizeBlocks(section.blocks) ??
        paragraphs.map((text) => ({ type: "PARAGRAPH" as const, text }));
      return {
        key: String(section.key ?? `section-${position + 1}`)
          .replace(/[^a-z0-9-]/gi, "-")
          .toLowerCase(),
        kicker,
        title,
        paragraphs,
        blocks,
      };
    });
    const snapshot = JSON.stringify({
      questionText: draft.question_text,
      contextSummary,
      categoryId: category.id,
      sections,
      timeline,
      answerAttempts,
      keyTerms,
      relationships,
    });
    if (isPublishedRevision) {
      const revisionDraft = await env.DB.prepare(
        "SELECT question_id FROM question_revision_drafts WHERE question_id=?",
      )
        .bind(id)
        .first<{ question_id: string }>();
      if (!revisionDraft)
        return Response.json(
          {
            error:
              "Create a revision copy before editing this published Story.",
          },
          { status: 409 },
        );
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE question_revision_drafts SET snapshot_json=?,updated_at=CURRENT_TIMESTAMP WHERE question_id=?",
        ).bind(snapshot, id),
        env.DB.prepare(
          "INSERT INTO editorial_revisions (id,question_id,action,snapshot_json) VALUES (?,?,'STORY_SAVED',?)",
        ).bind(crypto.randomUUID(), id, snapshot),
      ]);
      return Response.json({
        id,
        sections: sections.length,
        revisionSaved: true,
      });
    }
    const existing = await env.DB.prepare(
      "SELECT id FROM question_story_sections WHERE question_id=?",
    )
      .bind(id)
      .all<{ id: string }>();
    const statements = [
      ...(existing.results ?? []).map((section) =>
        env.DB.prepare(
          "DELETE FROM question_story_blocks WHERE section_id=?",
        ).bind(section.id),
      ),
      ...(existing.results ?? []).map((section) =>
        env.DB.prepare(
          "DELETE FROM question_story_paragraphs WHERE section_id=?",
        ).bind(section.id),
      ),
      env.DB.prepare(
        "DELETE FROM question_story_sections WHERE question_id=?",
      ).bind(id),
      env.DB.prepare("DELETE FROM timeline_events WHERE question_id=?").bind(
        id,
      ),
      env.DB.prepare(
        "DELETE FROM question_answer_attempts WHERE question_id=?",
      ).bind(id),
      env.DB.prepare("DELETE FROM question_key_terms WHERE question_id=?").bind(
        id,
      ),
    ];
    keyTerms.forEach((item, position) =>
      statements.push(
        env.DB.prepare(
          "INSERT INTO question_key_terms (id,question_id,term,description,position) VALUES (?,?,?,?,?)",
        ).bind(crypto.randomUUID(), id, item.term, item.description, position),
      ),
    );
    answerAttempts.forEach((attempt, position) =>
      statements.push(
        env.DB.prepare(
          "INSERT INTO question_answer_attempts (id,question_id,title,author,publisher,source_url,publication_date,approach,scope,significance,unresolved,verified,position) VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?)",
        ).bind(
          crypto.randomUUID(),
          id,
          attempt.title,
          attempt.author,
          attempt.publisher,
          attempt.url,
          attempt.publicationDate,
          attempt.approach,
          attempt.scope,
          attempt.significance,
          attempt.unresolved,
          position,
        ),
      ),
    );
    timeline.forEach((event, position) =>
      statements.push(
        env.DB.prepare(
          "INSERT INTO timeline_events (id,question_id,display_date,title,description,position) VALUES (?,?,?,?,?,?)",
        ).bind(
          crypto.randomUUID(),
          id,
          event.displayDate,
          event.title,
          event.description,
          position,
        ),
      ),
    );
    sections.forEach((section, position) => {
      const sectionId = crypto.randomUUID();
      statements.push(
        env.DB.prepare(
          "INSERT INTO question_story_sections (id,question_id,section_key,kicker,title,provenance,answer_leak_state,position) VALUES (?,?,?,?,?,'EDITORIAL','PENDING',?)",
        ).bind(
          sectionId,
          id,
          section.key,
          section.kicker,
          section.title,
          position,
        ),
      );
      section.paragraphs.forEach((paragraph, paragraphPosition) =>
        statements.push(
          env.DB.prepare(
            "INSERT INTO question_story_paragraphs (id,section_id,body,position) VALUES (?,?,?,?)",
          ).bind(crypto.randomUUID(), sectionId, paragraph, paragraphPosition),
        ),
      );
      section.blocks.forEach((block, blockPosition) => {
        const { type, ...data } = block;
        statements.push(
          env.DB.prepare(
            "INSERT INTO question_story_blocks (id,section_id,block_type,data_json,position,answer_leak_state) VALUES (?,?,?,?,?,'PENDING')",
          ).bind(
            crypto.randomUUID(),
            sectionId,
            type,
            JSON.stringify(data),
            blockPosition,
          ),
        );
      });
    });
    statements.push(
      env.DB.prepare(
        "INSERT INTO editorial_revisions (id,question_id,action,snapshot_json) VALUES (?,?,'STORY_SAVED',?)",
      ).bind(crypto.randomUUID(), id, snapshot),
    );
    statements.push(
      env.DB.prepare(
        "UPDATE questions SET context_summary=?,category_id=?,category_name=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      ).bind(contextSummary, category.id, category.name, id),
    );
    statements.push(
      env.DB.prepare(
        "INSERT INTO question_content_sections (id,question_id,section_type,body,provenance,publication_state,answer_leak_state,position) VALUES (?,?, 'SUMMARY',?,'EDITORIAL','DRAFT','PENDING',0) ON CONFLICT(question_id,section_type) DO UPDATE SET body=excluded.body,provenance='EDITORIAL',publication_state='DRAFT',answer_leak_state='PENDING',updated_at=CURRENT_TIMESTAMP",
      ).bind(crypto.randomUUID(), id, contextSummary),
    );
    statements.push(
      env.DB.prepare(
        "DELETE FROM question_relationships WHERE source_question_id=? AND created_by='AI_ASSISTED'",
      ).bind(id),
    );
    relationships.forEach((relationship) =>
      statements.push(
        env.DB.prepare(
          "INSERT INTO question_relationships (id,source_question_id,target_question_id,source_slug,target_slug,relationship_type,created_by,confidence,verified,rationale) SELECT ?,q.id,?,q.slug,?,?, 'AI_ASSISTED',?,1,? FROM questions q WHERE q.id=? ON CONFLICT(source_question_id,target_question_id,relationship_type) DO UPDATE SET created_by='AI_ASSISTED',confidence=excluded.confidence,verified=1,rationale=excluded.rationale",
        ).bind(
          crypto.randomUUID(),
          relationship.targetId,
          relationship.targetSlug,
          relationship.type,
          relationship.confidence,
          relationship.rationale,
          id,
        ),
      ),
    );
    await env.DB.batch(statements);
    return Response.json({
      id,
      sections: sections.length,
      revisionSaved: true,
    });
  }
  if (body.action === "publish_revision") {
    if (draft.publication_state !== "PUBLISHED")
      return Response.json(
        { error: "Only published questions can publish a revision." },
        { status: 409 },
      );
    const revisionDraft = await env.DB.prepare(
      "SELECT snapshot_json FROM question_revision_drafts WHERE question_id=?",
    )
      .bind(id)
      .first<RevisionDraftRow>();
    if (!revisionDraft)
      return Response.json(
        { error: "No private revision is ready to publish." },
        { status: 409 },
      );
    const revised = JSON.parse(revisionDraft.snapshot_json) as {
      contextSummary?: string;
      categoryId?: string;
      sections?: EditableSection[];
      timeline?: EditableTimelineEvent[];
      answerAttempts?: EditableAnswerAttempt[];
      keyTerms?: EditableKeyTerm[];
      relationships?: ApprovedRelationship[];
    };
    if (!revised.sections || revised.sections.length < 3)
      return Response.json(
        { error: "The revision needs at least three Story sections." },
        { status: 400 },
      );
    if (
      !revised.contextSummary ||
      revised.contextSummary.length < 150 ||
      countWords(revised.contextSummary) > 60 ||
      hasLikelyAnswerLeak(revised.contextSummary)
    )
      return Response.json(
        {
          error:
            "The revision context summary must contain at least 150 characters, remain answer-free, and use no more than 60 words.",
        },
        { status: 400 },
      );
    const revisedCategory = await env.DB.prepare(
      "SELECT id,name FROM categories WHERE id=?",
    )
      .bind(revised.categoryId ?? "")
      .first<{ id: string; name: string }>();
    if (!revisedCategory)
      return Response.json(
        { error: "The revision needs a valid category." },
        { status: 400 },
      );
    const currentSections = await env.DB.prepare(
      "SELECT id,section_key,kicker,title,position FROM question_story_sections WHERE question_id=? ORDER BY position",
    )
      .bind(id)
      .all<SectionRow>();
    const currentParagraphs = await env.DB.prepare(
      "SELECT p.section_id,p.body,p.position FROM question_story_paragraphs p JOIN question_story_sections s ON s.id=p.section_id WHERE s.question_id=? ORDER BY s.position,p.position",
    )
      .bind(id)
      .all<ParagraphRow>();
    const paragraphRows = currentParagraphs.results ?? [];
    const previousSections = (currentSections.results ?? []).map((section) => ({
      key: section.section_key,
      kicker: section.kicker,
      title: section.title,
      paragraphs: paragraphRows
        .filter((item) => item.section_id === section.id)
        .map((item) => item.body),
    }));
    const statements = [
      ...(currentSections.results ?? []).map((section) =>
        env.DB.prepare(
          "DELETE FROM question_story_blocks WHERE section_id=?",
        ).bind(section.id),
      ),
      ...(currentSections.results ?? []).map((section) =>
        env.DB.prepare(
          "DELETE FROM question_story_paragraphs WHERE section_id=?",
        ).bind(section.id),
      ),
      env.DB.prepare(
        "DELETE FROM question_story_sections WHERE question_id=?",
      ).bind(id),
      env.DB.prepare("DELETE FROM timeline_events WHERE question_id=?").bind(
        id,
      ),
      env.DB.prepare(
        "DELETE FROM question_answer_attempts WHERE question_id=?",
      ).bind(id),
      env.DB.prepare("DELETE FROM question_key_terms WHERE question_id=?").bind(
        id,
      ),
    ];
    (revised.keyTerms ?? []).forEach((item, position) =>
      statements.push(
        env.DB.prepare(
          "INSERT INTO question_key_terms (id,question_id,term,description,position) VALUES (?,?,?,?,?)",
        ).bind(crypto.randomUUID(), id, item.term, item.description, position),
      ),
    );
    (revised.answerAttempts ?? []).forEach((attempt, position) =>
      statements.push(
        env.DB.prepare(
          "INSERT INTO question_answer_attempts (id,question_id,title,author,publisher,source_url,publication_date,approach,scope,significance,unresolved,verified,position) VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?)",
        ).bind(
          crypto.randomUUID(),
          id,
          attempt.title,
          attempt.author,
          attempt.publisher,
          attempt.url,
          attempt.publicationDate,
          attempt.approach,
          attempt.scope,
          attempt.significance,
          attempt.unresolved,
          position,
        ),
      ),
    );
    (revised.timeline ?? []).forEach((event, position) =>
      statements.push(
        env.DB.prepare(
          "INSERT INTO timeline_events (id,question_id,display_date,title,description,position) VALUES (?,?,?,?,?,?)",
        ).bind(
          crypto.randomUUID(),
          id,
          event.displayDate,
          event.title,
          event.description,
          position,
        ),
      ),
    );
    revised.sections.forEach((section, position) => {
      const sectionId = crypto.randomUUID();
      statements.push(
        env.DB.prepare(
          "INSERT INTO question_story_sections (id,question_id,section_key,kicker,title,provenance,answer_leak_state,reviewed_at,position) VALUES (?,?,?,?,?,'EDITORIAL','PASSED',CURRENT_TIMESTAMP,?)",
        ).bind(
          sectionId,
          id,
          section.key,
          section.kicker,
          section.title,
          position,
        ),
      );
      section.paragraphs.forEach((paragraph, paragraphPosition) =>
        statements.push(
          env.DB.prepare(
            "INSERT INTO question_story_paragraphs (id,section_id,body,position) VALUES (?,?,?,?)",
          ).bind(crypto.randomUUID(), sectionId, paragraph, paragraphPosition),
        ),
      );
      (
        section.blocks ??
        section.paragraphs.map((text) => ({ type: "PARAGRAPH" as const, text }))
      ).forEach((block, blockPosition) => {
        const { type, ...data } = block;
        statements.push(
          env.DB.prepare(
            "INSERT INTO question_story_blocks (id,section_id,block_type,data_json,position,answer_leak_state) VALUES (?,?,?,?,?,'PASSED')",
          ).bind(
            crypto.randomUUID(),
            sectionId,
            type,
            JSON.stringify(data),
            blockPosition,
          ),
        );
      });
    });
    statements.push(
      env.DB.prepare(
        "INSERT INTO editorial_revisions (id,question_id,action,snapshot_json) VALUES (?,?,'PUBLISHED',?)",
      ).bind(
        crypto.randomUUID(),
        id,
        JSON.stringify({
          previousSections,
          publishedSections: revised.sections,
        }),
      ),
    );
    statements.push(
      env.DB.prepare(
        "DELETE FROM question_revision_drafts WHERE question_id=?",
      ).bind(id),
    );
    statements.push(
      env.DB.prepare(
        "UPDATE questions SET context_summary=?,category_id=?,category_name=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      ).bind(
        revised.contextSummary,
        revisedCategory.id,
        revisedCategory.name,
        id,
      ),
    );
    statements.push(
      env.DB.prepare(
        "DELETE FROM question_relationships WHERE source_question_id=? AND created_by='AI_ASSISTED'",
      ).bind(id),
    );
    (revised.relationships ?? []).forEach((relationship) =>
      statements.push(
        env.DB.prepare(
          "INSERT INTO question_relationships (id,source_question_id,target_question_id,source_slug,target_slug,relationship_type,created_by,confidence,verified,rationale) SELECT ?,q.id,?,q.slug,?,?, 'AI_ASSISTED',?,1,? FROM questions q WHERE q.id=? ON CONFLICT(source_question_id,target_question_id,relationship_type) DO UPDATE SET created_by='AI_ASSISTED',confidence=excluded.confidence,verified=1,rationale=excluded.rationale",
        ).bind(
          crypto.randomUUID(),
          relationship.targetId,
          relationship.targetSlug,
          relationship.type,
          relationship.confidence,
          relationship.rationale,
          id,
        ),
      ),
    );
    statements.push(
      env.DB.prepare(
        "UPDATE question_content_sections SET body=?,provenance='EDITORIAL',publication_state='PUBLISHED',answer_leak_state='PASSED',updated_at=CURRENT_TIMESTAMP WHERE question_id=? AND section_type='SUMMARY'",
      ).bind(revised.contextSummary, id),
    );
    statements.push(
      env.DB.prepare("DELETE FROM question_search WHERE question_id=?").bind(
        id,
      ),
    );
    statements.push(
      env.DB.prepare(
        "INSERT INTO question_search (question_id,question_text,context_summary,category_name,tags) SELECT q.id,q.question_text,q.context_summary,COALESCE(c.name,q.category_name,''),COALESCE((SELECT group_concat(t.name,' ') FROM question_tags qt JOIN tags t ON t.id=qt.tag_id WHERE qt.question_id=q.id),'') FROM questions q LEFT JOIN categories c ON c.id=q.category_id WHERE q.id=?",
      ).bind(id),
    );
    await env.DB.batch(statements);
    return Response.json({
      id,
      publicationState: "PUBLISHED",
      revisionPublished: true,
    });
  }
  if (body.action !== "publish")
    return Response.json(
      { error: "Unsupported editorial action." },
      { status: 400 },
    );
  if (draft.editorial_outcome === "REJECTED")
    return Response.json(
      { error: "A rejected question cannot be published." },
      { status: 409 },
    );
  if (draft.publication_state !== "DRAFT")
    return Response.json(
      { error: "Only drafts can be published." },
      { status: 409 },
    );
  if (draft.submission_state && draft.submission_state !== "SUBMITTED")
    return Response.json(
      {
        error:
          "The publisher must submit this question before it can be published.",
      },
      { status: 409 },
    );
  if (!isAnswerStatus(body.verifiedStatus))
    return Response.json(
      { error: "Choose a verified status before publishing." },
      { status: 400 },
    );
  if (
    draft.context_summary.trim().length < 150 ||
    countWords(draft.context_summary) > 60 ||
    hasLikelyAnswerLeak(draft.context_summary)
  )
    return Response.json(
      {
        error:
          "The context summary must contain at least 150 characters, remain answer-free, and use no more than 60 words.",
      },
      { status: 400 },
    );
  const storyCount = await env.DB.prepare(
    "SELECT COUNT(*) count FROM question_story_sections WHERE question_id=?",
  )
    .bind(id)
    .first<{ count: number }>();
  if ((storyCount?.count ?? 0) < 3)
    return Response.json(
      {
        error: "Add at least three reviewed Story sections before publishing.",
      },
      { status: 400 },
    );
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE question_content_sections SET publication_state='PUBLISHED',answer_leak_state='PASSED',reviewed_by='EDITORIAL',reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE question_id=? AND section_type='SUMMARY'",
    ).bind(id),
    env.DB.prepare(
      "UPDATE question_story_sections SET answer_leak_state='PASSED',reviewed_at=CURRENT_TIMESTAMP WHERE question_id=?",
    ).bind(id),
    env.DB.prepare(
      "UPDATE question_story_blocks SET answer_leak_state='PASSED',updated_at=CURRENT_TIMESTAMP WHERE section_id IN (SELECT id FROM question_story_sections WHERE question_id=?)",
    ).bind(id),
    env.DB.prepare(
      "UPDATE questions SET publication_state='PUBLISHED',visibility='PUBLIC',submission_state=CASE WHEN submission_state IS NULL THEN NULL ELSE 'APPROVED' END,review_notes=NULL,reviewed_at=CURRENT_TIMESTAMP,verified_status=?,verification_state='VERIFIED',last_verified_at=CURRENT_TIMESTAMP,published_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    ).bind(body.verifiedStatus, id),
    env.DB.prepare("DELETE FROM question_search WHERE question_id=?").bind(id),
    env.DB.prepare(
      "INSERT INTO question_search (question_id,question_text,context_summary,category_name,tags) SELECT q.id,q.question_text,q.context_summary,COALESCE(c.name,q.category_name,''),COALESCE((SELECT group_concat(t.name,' ') FROM question_tags qt JOIN tags t ON t.id=qt.tag_id WHERE qt.question_id=q.id),'') FROM questions q LEFT JOIN categories c ON c.id=q.category_id WHERE q.id=?",
    ).bind(id),
    env.DB.prepare(
      "INSERT INTO editorial_revisions (id,question_id,action,snapshot_json) VALUES (?,?,'PUBLISHED',?)",
    ).bind(
      crypto.randomUUID(),
      id,
      JSON.stringify({ verifiedStatus: body.verifiedStatus }),
    ),
    eventStatement(
      env.DB,
      id,
      "EDITORIAL",
      "PUBLISHED",
      `Verified status: ${body.verifiedStatus}`,
    ),
  ]);
  return Response.json({ id, publicationState: "PUBLISHED" });
}
