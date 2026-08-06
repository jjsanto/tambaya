import { hasLikelyAnswerLeak, isAnswerStatus, slugifyQuestion, type AnswerStatus, type StoryBlock } from "@/domain/question";
import type { D1DatabaseLike, D1Statement } from "@/types/cloudflare";

export type SubmissionState = "DRAFT" | "SUBMITTED" | "CHANGES_REQUESTED" | "APPROVED";
export type SubmissionSection = { key: string; kicker: string; title: string; blocks: StoryBlock[] };
export type SubmissionInput = { questionText: string; categoryId: string; claimedStatus: AnswerStatus; contextSummary: string; tags: string[]; sections: SubmissionSection[] };
export type SubmissionDetail = SubmissionInput & { id: string; slug: string; state: SubmissionState; reviewNotes: string; updatedAt: string };

type QuestionRow = { id: string; slug: string; question_text: string; category_id: string; claimed_status: AnswerStatus; context_summary: string; submission_state: SubmissionState; review_notes: string; updated_at: string };
type SectionRow = { id: string; section_key: string; kicker: string; title: string };
type BlockRow = { section_id: string; block_type: StoryBlock["type"]; data_json: string };
type TagRow = { name: string };

const clean = (value: unknown, limit: number) => String(value ?? "").trim().slice(0,limit);

export function normalizeStoryBlock(value: unknown): StoryBlock | null {
  const block = value as Record<string,unknown>; const type = String(block?.type ?? "");
  if (type === "PARAGRAPH") { const text = clean(block.text,5000); return text ? { type,text } : null; }
  if (type === "HEADING") { const text = clean(block.text,160); return text ? { type,text,level:block.level === 4 ? 4 : 3 } : null; }
  if (type === "IMAGE") { const src = clean(block.src,1000); const alt = clean(block.alt,300); if ((!src.startsWith("/") && !/^https:\/\//i.test(src)) || !alt) return null; return { type,src,alt,caption:clean(block.caption,500)||undefined,credit:clean(block.credit,300)||undefined,sourceUrl:clean(block.sourceUrl,1000)||undefined }; }
  if (type === "TABLE") { const headers = Array.isArray(block.headers) ? block.headers.slice(0,12).map(value => clean(value,200)) : []; const rows = Array.isArray(block.rows) ? block.rows.slice(0,100).map(row => Array.isArray(row) ? row.slice(0,12).map(value => clean(value,500)) : []) : []; return headers.length && rows.length && rows.every(row => row.length === headers.length) ? { type,caption:clean(block.caption,500)||undefined,headers,rows } : null; }
  if (type === "LIST") { const items = Array.isArray(block.items) ? block.items.slice(0,100).map(value => clean(value,1000)).filter(Boolean) : []; return items.length ? { type,style:block.style === "ORDERED" ? "ORDERED" : "UNORDERED",items } : null; }
  if (type === "QUOTE") { const text = clean(block.text,3000); return text ? { type,text,attribution:clean(block.attribution,300)||undefined,sourceUrl:clean(block.sourceUrl,1000)||undefined } : null; }
  if (type === "CALLOUT") { const text = clean(block.text,3000); return text ? { type,text,title:clean(block.title,200)||undefined,tone:["NOTE","CONTEXT","CAUTION"].includes(String(block.tone)) ? block.tone as "NOTE"|"CONTEXT"|"CAUTION" : "CONTEXT" } : null; }
  return null;
}

export function parseSubmission(value: unknown): SubmissionInput | null {
  const body = value as Record<string,unknown>; const questionText = clean(body?.questionText,300); const categoryId = clean(body?.categoryId,100); const contextSummary = clean(body?.contextSummary,5000);
  if (questionText.length < 10 || !questionText.endsWith("?") || !categoryId || !isAnswerStatus(body?.claimedStatus)) return null;
  const tags = Array.isArray(body.tags) ? body.tags.slice(0,12).map(value => clean(value,40)).filter(Boolean) : [];
  const sections = Array.isArray(body.sections) ? body.sections.slice(0,20).map((value,index) => { const section = value as Record<string,unknown>; const blocks = Array.isArray(section.blocks) ? section.blocks.slice(0,40).map(normalizeStoryBlock).filter((block): block is StoryBlock => !!block) : []; return { key:`section-${index+1}`,kicker:clean(section.kicker,80),title:clean(section.title,180),blocks }; }) : [];
  return { questionText,categoryId,claimedStatus:body.claimedStatus,contextSummary,tags:[...new Set(tags)],sections };
}

export function validateForSubmission(input: SubmissionInput) {
  if (input.contextSummary.length < 150 || hasLikelyAnswerLeak(input.contextSummary)) return "Write at least 150 answer-free characters explaining the question’s context.";
  if (input.sections.length < 3) return "Add at least three Story sections before submitting.";
  for (const [index,section] of input.sections.entries()) {
    const paragraphs = section.blocks.filter((block): block is Extract<StoryBlock,{type:"PARAGRAPH"}> => block.type === "PARAGRAPH");
    if (!section.kicker || section.title.length < 4 || !paragraphs.length || paragraphs.some(block => block.text.length < 80 || hasLikelyAnswerLeak(block.text))) return `Section ${index+1} needs a title and an answer-free paragraph of at least 80 characters.`;
  }
  return null;
}

const tagSlug = (value: string) => slugifyQuestion(value).slice(0,80);
export async function replaceSubmissionContent(db: D1DatabaseLike, id: string, input: SubmissionInput, state: SubmissionState) {
  const category = await db.prepare("SELECT name FROM categories WHERE id=?").bind(input.categoryId).first<{name:string}>();
  if (!category) throw new Error("CATEGORY");
  const existing = await db.prepare("SELECT id FROM question_story_sections WHERE question_id=?").bind(id).all<{id:string}>();
  const statements: D1Statement[] = [
    ...(existing.results ?? []).map(section => db.prepare("DELETE FROM question_story_blocks WHERE section_id=?").bind(section.id)),
    ...(existing.results ?? []).map(section => db.prepare("DELETE FROM question_story_paragraphs WHERE section_id=?").bind(section.id)),
    db.prepare("DELETE FROM question_story_sections WHERE question_id=?").bind(id),
    db.prepare("DELETE FROM question_tags WHERE question_id=?").bind(id),
    db.prepare("UPDATE questions SET question_text=?,category_id=?,category_name=?,claimed_status=?,context_summary=?,submission_state=?,review_notes=CASE WHEN ?='SUBMITTED' THEN NULL ELSE review_notes END,submitted_at=CASE WHEN ?='SUBMITTED' THEN CURRENT_TIMESTAMP ELSE submitted_at END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(input.questionText,input.categoryId,category.name,input.claimedStatus,input.contextSummary,state,state,state,id),
    db.prepare("INSERT INTO question_content_sections (id,question_id,section_type,body,provenance,publication_state,answer_leak_state,position) VALUES (?,?, 'SUMMARY',?,'PUBLISHER','DRAFT','PENDING',0) ON CONFLICT(question_id,section_type) DO UPDATE SET body=excluded.body,provenance='PUBLISHER',publication_state='DRAFT',answer_leak_state='PENDING',updated_at=CURRENT_TIMESTAMP").bind(crypto.randomUUID(),id,input.contextSummary),
  ];
  input.sections.forEach((section,position) => { const sectionId=crypto.randomUUID(); statements.push(db.prepare("INSERT INTO question_story_sections (id,question_id,section_key,kicker,title,provenance,answer_leak_state,position) VALUES (?,?,?,?,?,'PUBLISHER','PENDING',?)").bind(sectionId,id,section.key,section.kicker,section.title,position)); let paragraphPosition=0; section.blocks.forEach((block,blockPosition) => { const {type,...data}=block; statements.push(db.prepare("INSERT INTO question_story_blocks (id,section_id,block_type,data_json,position,answer_leak_state) VALUES (?,?,?,?,?,'PENDING')").bind(crypto.randomUUID(),sectionId,type,JSON.stringify(data),blockPosition)); if(type==="PARAGRAPH") statements.push(db.prepare("INSERT INTO question_story_paragraphs (id,section_id,body,position) VALUES (?,?,?,?)").bind(crypto.randomUUID(),sectionId,block.text,paragraphPosition++)); }); });
  input.tags.forEach(name => { const slug=tagSlug(name); if(!slug)return; const tagId=`tag-${slug}`; statements.push(db.prepare("INSERT OR IGNORE INTO tags (id,name,slug) VALUES (?,?,?)").bind(tagId,name,slug)); statements.push(db.prepare("INSERT OR IGNORE INTO question_tags (question_id,tag_id) VALUES (?,?)").bind(id,tagId)); });
  await db.batch(statements);
}

export async function loadSubmission(db:D1DatabaseLike,id:string,userId:string):Promise<SubmissionDetail|null>{
  const question=await db.prepare("SELECT id,slug,question_text,category_id,claimed_status,context_summary,submission_state,COALESCE(review_notes,'') review_notes,updated_at FROM questions WHERE id=? AND publisher_id=? AND submission_state IS NOT NULL").bind(id,userId).first<QuestionRow>(); if(!question)return null;
  const [sectionsResult,blocksResult,tagsResult]=await Promise.all([db.prepare("SELECT id,section_key,kicker,title FROM question_story_sections WHERE question_id=? ORDER BY position").bind(id).all<SectionRow>(),db.prepare("SELECT b.section_id,b.block_type,b.data_json FROM question_story_blocks b JOIN question_story_sections s ON s.id=b.section_id WHERE s.question_id=? ORDER BY s.position,b.position").bind(id).all<BlockRow>(),db.prepare("SELECT t.name FROM tags t JOIN question_tags qt ON qt.tag_id=t.id WHERE qt.question_id=? ORDER BY t.name").bind(id).all<TagRow>()]); const blocks=blocksResult.results??[];
  return {id:question.id,slug:question.slug,questionText:question.question_text,categoryId:question.category_id,claimedStatus:question.claimed_status,contextSummary:question.context_summary,tags:(tagsResult.results??[]).map(tag=>tag.name),sections:(sectionsResult.results??[]).map(section=>({key:section.section_key,kicker:section.kicker,title:section.title,blocks:blocks.filter(block=>block.section_id===section.id).map(block=>({type:block.block_type,...JSON.parse(block.data_json)}) as StoryBlock)})),state:question.submission_state,reviewNotes:question.review_notes,updatedAt:question.updated_at};
}
