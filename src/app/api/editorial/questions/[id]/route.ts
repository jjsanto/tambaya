import { getCloudflareContext } from "@opennextjs/cloudflare";
import { hasLikelyAnswerLeak, isAnswerStatus } from "@/domain/question";
import { hasEditorialAccess, unauthorized } from "@/lib/editorial-auth";
import type { CloudflareBindings } from "@/types/cloudflare";

type DraftRow = { id: string; question_text: string; context_summary: string; publication_state: string };
type SectionRow = { id: string; section_key: string; kicker: string; title: string; position: number };
type ParagraphRow = { section_id: string; body: string; position: number };
type RevisionRow = { id: string; action: string; created_at: string };
type RevisionDraftRow = { snapshot_json: string; created_at: string; updated_at: string };
type EditableSection = { key: string; kicker: string; title: string; paragraphs: string[] };

async function runtime() {
  return await getCloudflareContext({ async: true }) as unknown as { env: CloudflareBindings };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await runtime();
  if (!await hasEditorialAccess(request, env)) return unauthorized();
  const { id } = await params;
  const question = await env.DB.prepare("SELECT id,question_text,context_summary,publication_state FROM questions WHERE id=?").bind(id).first<DraftRow>();
  if (!question) return Response.json({ error: "Question not found." }, { status: 404 });
  const [sectionsResult, paragraphsResult, revisionsResult, revisionDraft] = await Promise.all([
    env.DB.prepare("SELECT id,section_key,kicker,title,position FROM question_story_sections WHERE question_id=? ORDER BY position").bind(id).all<SectionRow>(),
    env.DB.prepare("SELECT p.section_id,p.body,p.position FROM question_story_paragraphs p JOIN question_story_sections s ON s.id=p.section_id WHERE s.question_id=? ORDER BY s.position,p.position").bind(id).all<ParagraphRow>(),
    env.DB.prepare("SELECT id,action,created_at FROM editorial_revisions WHERE question_id=? ORDER BY created_at DESC LIMIT 12").bind(id).all<RevisionRow>(),
    env.DB.prepare("SELECT snapshot_json,created_at,updated_at FROM question_revision_drafts WHERE question_id=?").bind(id).first<RevisionDraftRow>(),
  ]);
  const paragraphs = paragraphsResult.results ?? [];
  const liveSections = (sectionsResult.results ?? []).map(section => ({ key: section.section_key, kicker: section.kicker, title: section.title, paragraphs: paragraphs.filter(item => item.section_id === section.id).map(item => item.body) }));
  const workingCopy = revisionDraft ? JSON.parse(revisionDraft.snapshot_json) as { sections?: EditableSection[] } : null;
  return Response.json({ question: { ...question, sections: workingCopy?.sections ?? liveSections, liveSections, hasPendingRevision: !!revisionDraft, revisionDraftUpdatedAt: revisionDraft?.updated_at ?? null, revisions: revisionsResult.results ?? [] } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await runtime();
  if (!await hasEditorialAccess(request, env)) return unauthorized();
  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;
  const draft = await env.DB.prepare("SELECT id,question_text,context_summary,publication_state FROM questions WHERE id=?").bind(id).first<DraftRow>();
  if (!draft) return Response.json({ error: "Question not found." }, { status: 404 });
  if (body.action === "begin_revision") {
    if (draft.publication_state !== "PUBLISHED") return Response.json({ error: "Only published questions need a separate revision copy." }, { status: 409 });
    const existingDraft = await env.DB.prepare("SELECT question_id FROM question_revision_drafts WHERE question_id=?").bind(id).first<{ question_id: string }>();
    if (!existingDraft) {
      const sectionsResult = await env.DB.prepare("SELECT id,section_key,kicker,title FROM question_story_sections WHERE question_id=? ORDER BY position").bind(id).all<SectionRow>();
      const paragraphsResult = await env.DB.prepare("SELECT p.section_id,p.body FROM question_story_paragraphs p JOIN question_story_sections s ON s.id=p.section_id WHERE s.question_id=? ORDER BY s.position,p.position").bind(id).all<ParagraphRow>();
      const paragraphs = paragraphsResult.results ?? [];
      const sections = (sectionsResult.results ?? []).map(section => ({ key: section.section_key, kicker: section.kicker, title: section.title, paragraphs: paragraphs.filter(item => item.section_id === section.id).map(item => item.body) }));
      await env.DB.prepare("INSERT INTO question_revision_drafts (question_id,snapshot_json) VALUES (?,?)").bind(id,JSON.stringify({ questionText: draft.question_text, contextSummary: draft.context_summary, sections })).run();
    }
    return Response.json({ id, revisionState: "DRAFT" });
  }
  if (body.action === "discard_revision") {
    await env.DB.prepare("DELETE FROM question_revision_drafts WHERE question_id=?").bind(id).run();
    return Response.json({ id, revisionState: "DISCARDED" });
  }
  if (body.action === "save_story" || body.action === "save_revision") {
    const isPublishedRevision = draft.publication_state === "PUBLISHED";
    if (isPublishedRevision && body.action !== "save_revision") return Response.json({ error: "Published Stories require a revision copy." }, { status: 409 });
    if (!isPublishedRevision && draft.publication_state !== "DRAFT") return Response.json({ error: "This record cannot be edited." }, { status: 409 });
    if (!Array.isArray(body.sections) || body.sections.length < 3 || body.sections.length > 20) return Response.json({ error: "A Story requires between 3 and 20 sections." }, { status: 400 });
    for (const [position, value] of body.sections.entries()) {
      const section = value as Record<string, unknown>; const title = String(section.title ?? "").trim();
      const paragraphs = Array.isArray(section.paragraphs) ? section.paragraphs.map(item => String(item).trim()).filter(Boolean) : [];
      if (!String(section.kicker ?? "").trim() || title.length < 4 || paragraphs.length === 0 || paragraphs.some(paragraph => paragraph.length < 80 || hasLikelyAnswerLeak(paragraph))) return Response.json({ error: `Section ${position + 1} needs a title and answer-free paragraphs of at least 80 characters.` }, { status: 400 });
    }
    const sections = body.sections.map((value, position) => {
      const section = value as Record<string, unknown>;
      const kicker = String(section.kicker ?? "").trim(); const title = String(section.title ?? "").trim();
      const paragraphs = Array.isArray(section.paragraphs) ? section.paragraphs.map(item => String(item).trim()).filter(Boolean) : [];
      return { key: String(section.key ?? `section-${position + 1}`).replace(/[^a-z0-9-]/gi,"-").toLowerCase(), kicker, title, paragraphs };
    });
    const snapshot = JSON.stringify({ questionText: draft.question_text, contextSummary: draft.context_summary, sections });
    if (isPublishedRevision) {
      const revisionDraft = await env.DB.prepare("SELECT question_id FROM question_revision_drafts WHERE question_id=?").bind(id).first<{ question_id: string }>();
      if (!revisionDraft) return Response.json({ error: "Create a revision copy before editing this published Story." }, { status: 409 });
      await env.DB.batch([
        env.DB.prepare("UPDATE question_revision_drafts SET snapshot_json=?,updated_at=CURRENT_TIMESTAMP WHERE question_id=?").bind(snapshot,id),
        env.DB.prepare("INSERT INTO editorial_revisions (id,question_id,action,snapshot_json) VALUES (?,?,'STORY_SAVED',?)").bind(crypto.randomUUID(),id,snapshot),
      ]);
      return Response.json({ id, sections: sections.length, revisionSaved: true });
    }
    const existing = await env.DB.prepare("SELECT id FROM question_story_sections WHERE question_id=?").bind(id).all<{ id: string }>();
    const statements = [
      ...(existing.results ?? []).map(section => env.DB.prepare("DELETE FROM question_story_paragraphs WHERE section_id=?").bind(section.id)),
      env.DB.prepare("DELETE FROM question_story_sections WHERE question_id=?").bind(id),
    ];
    sections.forEach((section, position) => { const sectionId = crypto.randomUUID(); statements.push(env.DB.prepare("INSERT INTO question_story_sections (id,question_id,section_key,kicker,title,provenance,answer_leak_state,position) VALUES (?,?,?,?,?,'EDITORIAL','PENDING',?)").bind(sectionId,id,section.key,section.kicker,section.title,position)); section.paragraphs.forEach((paragraph, paragraphPosition) => statements.push(env.DB.prepare("INSERT INTO question_story_paragraphs (id,section_id,body,position) VALUES (?,?,?,?)").bind(crypto.randomUUID(),sectionId,paragraph,paragraphPosition))); });
    statements.push(env.DB.prepare("INSERT INTO editorial_revisions (id,question_id,action,snapshot_json) VALUES (?,?,'STORY_SAVED',?)").bind(crypto.randomUUID(),id,snapshot));
    statements.push(env.DB.prepare("UPDATE questions SET updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id));
    await env.DB.batch(statements);
    return Response.json({ id, sections: sections.length, revisionSaved: true });
  }
  if (body.action === "publish_revision") {
    if (draft.publication_state !== "PUBLISHED") return Response.json({ error: "Only published questions can publish a revision." }, { status: 409 });
    const revisionDraft = await env.DB.prepare("SELECT snapshot_json FROM question_revision_drafts WHERE question_id=?").bind(id).first<RevisionDraftRow>();
    if (!revisionDraft) return Response.json({ error: "No private revision is ready to publish." }, { status: 409 });
    const revised = JSON.parse(revisionDraft.snapshot_json) as { sections?: EditableSection[] };
    if (!revised.sections || revised.sections.length < 3) return Response.json({ error: "The revision needs at least three Story sections." }, { status: 400 });
    const currentSections = await env.DB.prepare("SELECT id,section_key,kicker,title,position FROM question_story_sections WHERE question_id=? ORDER BY position").bind(id).all<SectionRow>();
    const currentParagraphs = await env.DB.prepare("SELECT p.section_id,p.body,p.position FROM question_story_paragraphs p JOIN question_story_sections s ON s.id=p.section_id WHERE s.question_id=? ORDER BY s.position,p.position").bind(id).all<ParagraphRow>();
    const paragraphRows = currentParagraphs.results ?? [];
    const previousSections = (currentSections.results ?? []).map(section => ({ key: section.section_key, kicker: section.kicker, title: section.title, paragraphs: paragraphRows.filter(item => item.section_id === section.id).map(item => item.body) }));
    const statements = [
      ...(currentSections.results ?? []).map(section => env.DB.prepare("DELETE FROM question_story_paragraphs WHERE section_id=?").bind(section.id)),
      env.DB.prepare("DELETE FROM question_story_sections WHERE question_id=?").bind(id),
    ];
    revised.sections.forEach((section, position) => { const sectionId = crypto.randomUUID(); statements.push(env.DB.prepare("INSERT INTO question_story_sections (id,question_id,section_key,kicker,title,provenance,answer_leak_state,reviewed_at,position) VALUES (?,?,?,?,?,'EDITORIAL','PASSED',CURRENT_TIMESTAMP,?)").bind(sectionId,id,section.key,section.kicker,section.title,position)); section.paragraphs.forEach((paragraph, paragraphPosition) => statements.push(env.DB.prepare("INSERT INTO question_story_paragraphs (id,section_id,body,position) VALUES (?,?,?,?)").bind(crypto.randomUUID(),sectionId,paragraph,paragraphPosition))); });
    statements.push(env.DB.prepare("INSERT INTO editorial_revisions (id,question_id,action,snapshot_json) VALUES (?,?,'PUBLISHED',?)").bind(crypto.randomUUID(),id,JSON.stringify({ previousSections, publishedSections: revised.sections })));
    statements.push(env.DB.prepare("DELETE FROM question_revision_drafts WHERE question_id=?").bind(id));
    statements.push(env.DB.prepare("UPDATE questions SET updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id));
    await env.DB.batch(statements);
    return Response.json({ id, publicationState: "PUBLISHED", revisionPublished: true });
  }
  if (body.action !== "publish") return Response.json({ error: "Unsupported editorial action." }, { status: 400 });
  if (draft.publication_state !== "DRAFT") return Response.json({ error: "Only drafts can be published." }, { status: 409 });
  if (!isAnswerStatus(body.verifiedStatus)) return Response.json({ error: "Choose a verified status before publishing." }, { status: 400 });
  if (draft.context_summary.trim().length < 150 || hasLikelyAnswerLeak(draft.context_summary)) return Response.json({ error: "The context summary must contain at least 150 characters and remain answer-free." }, { status: 400 });
  const storyCount = await env.DB.prepare("SELECT COUNT(*) count FROM question_story_sections WHERE question_id=?").bind(id).first<{ count: number }>();
  if ((storyCount?.count ?? 0) < 3) return Response.json({ error: "Add at least three reviewed Story sections before publishing." }, { status: 400 });
  await env.DB.batch([
    env.DB.prepare("UPDATE question_content_sections SET publication_state='PUBLISHED',answer_leak_state='PASSED',reviewed_by='EDITORIAL',reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE question_id=? AND section_type='SUMMARY'").bind(id),
    env.DB.prepare("UPDATE question_story_sections SET answer_leak_state='PASSED',reviewed_at=CURRENT_TIMESTAMP WHERE question_id=?").bind(id),
    env.DB.prepare("UPDATE questions SET publication_state='PUBLISHED',verified_status=?,verification_state='VERIFIED',last_verified_at=CURRENT_TIMESTAMP,published_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(body.verifiedStatus,id),
    env.DB.prepare("INSERT INTO editorial_revisions (id,question_id,action,snapshot_json) VALUES (?,?,'PUBLISHED',?)").bind(crypto.randomUUID(),id,JSON.stringify({ verifiedStatus: body.verifiedStatus })),
  ]);
  return Response.json({ id, publicationState: "PUBLISHED" });
}
