import { writeFileSync } from "node:fs";
import { bulkQuestions, bulkRelationships } from "../src/data/bulk-questions";

const sql = (value:unknown) => `'${String(value ?? "").replaceAll("'","''")}'`;
const exists = (id:string) => `EXISTS (SELECT 1 FROM questions WHERE id=${sql(id)})`;

for (let batchIndex=0; batchIndex<10; batchIndex++) {
  const questions = bulkQuestions.slice(batchIndex*200,(batchIndex+1)*200);
  const lines = ["PRAGMA foreign_keys = ON;"];
  for (const [slug,name] of new Map(questions.map(question=>[question.categorySlug,question.category]))) lines.push(`INSERT OR IGNORE INTO categories (id,name,slug) VALUES (${sql(slug)},${sql(name)},${sql(slug)});`);
  for (const tag of new Set(questions.flatMap(question=>question.tags))) lines.push(`INSERT OR IGNORE INTO tags (id,name,slug) VALUES (${sql(`tag-${tag}`)},${sql(tag)},${sql(tag)});`);
  for (const question of questions) {
    const id = question.id;
    lines.push(`INSERT OR IGNORE INTO questions (id,question_text,slug,publication_state,visibility,claimed_status,verified_status,verification_state,verification_confidence,last_verified_at,category_id,category_name,context_summary,public_json,featured,published_at) VALUES (${sql(id)},${sql(question.questionText)},${sql(question.slug)},'PUBLISHED','PUBLIC',${sql(question.claimedStatus)},${sql(question.verifiedStatus)},'VERIFIED',0.9,'2026-08-11',${sql(question.categorySlug)},${sql(question.category)},${sql(question.contextSummary)},'{}',0,'2026-08-11');`);
    const content = {SUMMARY:question.contextSummary,ORIGINS:question.origins,EVOLUTION:question.evolution,WHY_ASKED:question.whyAsked,WHY_IT_MATTERS:question.whyItMatters,WHERE_IT_APPEARS:question.whereItAppears} as const;
    Object.entries(content).forEach(([type,body],position)=>lines.push(`INSERT OR IGNORE INTO question_content_sections (id,question_id,section_type,body,provenance,publication_state,answer_leak_state,reviewed_by,reviewed_at,position) SELECT ${sql(`${id}-${type.toLowerCase()}`)},${sql(id)},${sql(type)},${sql(body)},'EDITORIAL','PUBLISHED','PASSED','EDITORIAL','2026-08-11',${position} WHERE ${exists(id)};`));
    question.storySections.forEach((section,position)=>{
      const sectionId=`${id}-story-${section.id}`;
      lines.push(`INSERT OR IGNORE INTO question_story_sections (id,question_id,section_key,kicker,title,provenance,answer_leak_state,reviewed_at,position) SELECT ${sql(sectionId)},${sql(id)},${sql(section.id)},${sql(section.kicker)},${sql(section.title)},'EDITORIAL','PASSED','2026-08-11',${position} WHERE ${exists(id)};`);
      section.paragraphs.forEach((paragraph,paragraphPosition)=>lines.push(`INSERT OR IGNORE INTO question_story_paragraphs (id,section_id,body,position) SELECT ${sql(`${sectionId}-p-${paragraphPosition}`)},${sql(sectionId)},${sql(paragraph)},${paragraphPosition} WHERE EXISTS (SELECT 1 FROM question_story_sections WHERE id=${sql(sectionId)});`));
      (section.blocks ?? []).forEach((block,blockPosition)=>{const {type,...data}=block;lines.push(`INSERT OR IGNORE INTO question_story_blocks (id,section_id,block_type,data_json,position,answer_leak_state) SELECT ${sql(`${sectionId}-block-${blockPosition}`)},${sql(sectionId)},${sql(type)},${sql(JSON.stringify(data))},${blockPosition},'PASSED' WHERE EXISTS (SELECT 1 FROM question_story_sections WHERE id=${sql(sectionId)});`);});
    });
    question.keyTerms.forEach((term,position)=>lines.push(`INSERT OR IGNORE INTO question_key_terms (id,question_id,term,description,position) SELECT ${sql(`${id}-term-${position}`)},${sql(id)},${sql(term.term)},${sql(term.description)},${position} WHERE ${exists(id)};`));
    question.branches.forEach((branch,position)=>lines.push(`INSERT OR IGNORE INTO question_branches (id,question_id,question_text,relationship_type,position) SELECT ${sql(`${id}-branch-${position}`)},${sql(id)},${sql(branch.question)},${sql(branch.relationship)},${position} WHERE ${exists(id)};`));
    question.timeline.forEach((event,position)=>lines.push(`INSERT OR IGNORE INTO timeline_events (id,question_id,display_date,title,description,position) SELECT ${sql(`${id}-time-${position}`)},${sql(id)},${sql(event.year)},${sql(event.title)},${sql(event.description)},${position} WHERE ${exists(id)};`));
    question.references.forEach((reference,position)=>lines.push(`INSERT OR IGNORE INTO question_references (id,question_id,title,publisher,source_url,purpose,position) SELECT ${sql(`${id}-ref-${position}`)},${sql(id)},${sql(reference.title)},${sql(reference.publisher)},${sql(reference.url)},${sql(reference.purpose)},${position} WHERE ${exists(id)};`));
    question.tags.forEach(tag=>lines.push(`INSERT OR IGNORE INTO question_tags (question_id,tag_id) SELECT ${sql(id)},${sql(`tag-${tag}`)} WHERE ${exists(id)};`));
    lines.push(`INSERT INTO question_search (question_id,question_text,context_summary,category_name,tags) SELECT ${sql(id)},${sql(question.questionText)},${sql(question.contextSummary)},${sql(question.category)},${sql(question.tags.join(" "))} WHERE ${exists(id)} AND NOT EXISTS (SELECT 1 FROM question_search WHERE question_id=${sql(id)});`);
  }
  const migration=String(25+batchIndex).padStart(4,"0");
  writeFileSync(new URL(`../migrations/${migration}_bulk_questions_${batchIndex+1}.sql`,import.meta.url),`${lines.join("\n")}\n`);
}

const relationshipLines=["PRAGMA foreign_keys = ON;"];
bulkRelationships.forEach((relationship,index)=>{
  const source=bulkQuestions.find(question=>question.slug===relationship.sourceSlug)!;
  const target=bulkQuestions.find(question=>question.slug===relationship.targetSlug)!;
  relationshipLines.push(`INSERT OR IGNORE INTO question_relationships (id,source_question_id,target_question_id,source_slug,target_slug,relationship_type,created_by,confidence,verified) SELECT ${sql(`bulk-rel-${index+1}`)},${sql(source.id)},${sql(target.id)},${sql(source.slug)},${sql(target.slug)},${sql(relationship.type)},'EDITORIAL',1,1 WHERE ${exists(source.id)} AND ${exists(target.id)};`);
});
writeFileSync(new URL("../migrations/0035_bulk_question_relationships.sql",import.meta.url),`${relationshipLines.join("\n")}\n`);
console.log(`Generated 10 additive migrations: ${bulkQuestions.length} questions and ${bulkRelationships.length} relationships.`);
