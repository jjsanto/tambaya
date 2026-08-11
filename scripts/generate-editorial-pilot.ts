import { writeFileSync } from "node:fs";
import { editorialPilot } from "../src/data/editorial-pilot";

const sql=(value:unknown)=>`'${String(value??"").replaceAll("'","''")}'`;
const slugify=(value:string)=>value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const lines=["PRAGMA foreign_keys = ON;"];

for (const tag of new Set(editorialPilot.flatMap(seed=>seed.tags))) lines.push(`INSERT OR IGNORE INTO tags (id,name,slug) VALUES (${sql(`tag-${tag}`)},${sql(tag)},${sql(tag)});`);
editorialPilot.forEach((seed,index)=>{
  const id=`pilot-2026-${String(index+1).padStart(2,"0")}`;
  const slug=slugify(seed.question);
  const summary=`${seed.focus} Tambaya follows how this question changed, what evidence makes it difficult, and why its framing matters without presenting an answer.`;
  const sections=[
    {key:"origins",kicker:"Origins",title:"Where this question came from",body:`${seed.origins} Earlier formulations did not always separate the present question from neighbouring practical and moral concerns, so its history requires attention to changing terms as well as changing evidence.`},
    {key:"evolution",kicker:"Changing frames",title:"How the inquiry developed",body:`${seed.evolution} The resulting debate is not one continuous search for a fixed answer: methods, institutions, and the boundaries of the subject have changed together.`},
    {key:"why-asked",kicker:"Persistent uncertainty",title:"Why people keep asking",body:`${seed.focus} The question returns when existing categories fail to organize a new observation or decision, especially where several legitimate standards of evidence point in different directions.`},
    {key:"why-it-matters",kicker:"Consequences",title:"Why the framing matters",body:`${seed.stakes} Different formulations determine which experiences become visible, which comparisons appear legitimate, and which connected questions receive attention next.`},
    {key:"where-it-appears",kicker:"Across fields",title:"Where the question appears",body:`This question appears in ${seed.category.toLowerCase()}, public policy, education, professional practice, and interdisciplinary research through the recurring concepts ${seed.tags.join(", ").replaceAll("-"," ")}. Those settings do not necessarily use the same definitions or standards of evidence.`},
  ];
  lines.push(`INSERT OR IGNORE INTO questions (id,question_text,slug,publication_state,visibility,claimed_status,verification_state,category_id,category_name,context_summary,public_json,submission_state,publisher_motivation) VALUES (${sql(id)},${sql(seed.question)},${sql(slug)},'DRAFT','PRIVATE',${sql(seed.status)},'PENDING',${sql(seed.categorySlug)},${sql(seed.category)},${sql(summary)},'{}','SUBMITTED','Editorial pilot: independently formulated question for review before public release.');`);
  lines.push(`INSERT OR IGNORE INTO question_content_sections (id,question_id,section_type,body,provenance,publication_state,answer_leak_state,position) SELECT ${sql(`${id}-summary`)},${sql(id)},'SUMMARY',${sql(summary)},'EDITORIAL','DRAFT','PENDING',0 WHERE EXISTS (SELECT 1 FROM questions WHERE id=${sql(id)});`);
  sections.forEach((section,position)=>{
    const sectionId=`${id}-story-${section.key}`;
    lines.push(`INSERT OR IGNORE INTO question_story_sections (id,question_id,section_key,kicker,title,provenance,answer_leak_state,position) SELECT ${sql(sectionId)},${sql(id)},${sql(section.key)},${sql(section.kicker)},${sql(section.title)},'EDITORIAL','PENDING',${position} WHERE EXISTS (SELECT 1 FROM questions WHERE id=${sql(id)});`);
    lines.push(`INSERT OR IGNORE INTO question_story_paragraphs (id,section_id,body,position) SELECT ${sql(`${sectionId}-p-0`)},${sql(sectionId)},${sql(section.body)},0 WHERE EXISTS (SELECT 1 FROM question_story_sections WHERE id=${sql(sectionId)});`);
    lines.push(`INSERT OR IGNORE INTO question_story_blocks (id,section_id,block_type,data_json,position,answer_leak_state) SELECT ${sql(`${sectionId}-block-0`)},${sql(sectionId)},'PARAGRAPH',${sql(JSON.stringify({text:section.body}))},0,'PENDING' WHERE EXISTS (SELECT 1 FROM question_story_sections WHERE id=${sql(sectionId)});`);
  });
  seed.tags.forEach(tag=>lines.push(`INSERT OR IGNORE INTO question_tags (question_id,tag_id) SELECT ${sql(id)},${sql(`tag-${tag}`)} WHERE EXISTS (SELECT 1 FROM questions WHERE id=${sql(id)});`));
  [
    ["Earlier context","A precursor emerges",seed.origins],
    ["Changing methods","The inquiry is reframed",seed.evolution],
    ["Current significance","The question crosses fields",seed.stakes],
  ].forEach(([date,title,description],position)=>lines.push(`INSERT OR IGNORE INTO timeline_events (id,question_id,display_date,title,description,position) SELECT ${sql(`${id}-time-${position}`)},${sql(id)},${sql(date)},${sql(title)},${sql(description)},${position} WHERE EXISTS (SELECT 1 FROM questions WHERE id=${sql(id)});`));
  seed.tags.forEach((tag,position)=>lines.push(`INSERT OR IGNORE INTO question_key_terms (id,question_id,term,description,position) SELECT ${sql(`${id}-term-${position}`)},${sql(id)},${sql(tag.replaceAll("-"," ").replace(/\b\w/g,letter=>letter.toUpperCase()))},${sql(`A central concept in this question whose meaning varies across evidence, communities, and historical settings.`)},${position} WHERE EXISTS (SELECT 1 FROM questions WHERE id=${sql(id)});`));
  lines.push(`INSERT OR IGNORE INTO question_branches (id,question_id,question_text,relationship_type,position) SELECT ${sql(`${id}-branch-0`)},${sql(id)},${sql(`What evidence would most change how “${seed.question}” is framed?`)},'LEADS_TO',0 WHERE EXISTS (SELECT 1 FROM questions WHERE id=${sql(id)});`);
});

writeFileSync(new URL("../migrations/0037_editorial_pilot_questions.sql",import.meta.url),`${lines.join("\n")}\n`);
console.log(`Generated editorial pilot with ${editorialPilot.length} private review questions.`);
