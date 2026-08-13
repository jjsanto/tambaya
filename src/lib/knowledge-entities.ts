import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CloudflareBindings } from "@/types/cloudflare";

export async function knowledgeDb(){
  const {env}=await getCloudflareContext({async:true}) as unknown as {env:CloudflareBindings};
  return env.DB;
}

export type EntityQuestion={slug:string;questionText:string;category:string;status:string;association:string};

export async function findPerson(slug:string){
  const db=await knowledgeDb();
  const person=await db.prepare("SELECT id,slug,canonical_name name,period,bio FROM people WHERE slug=?").bind(slug).first<{id:string;slug:string;name:string;period:string;bio:string}>();
  if(!person)return null;
  const questions=await db.prepare("SELECT q.slug,q.question_text questionText,q.category_name category,COALESCE(q.verified_status,q.claimed_status) status,qp.association FROM question_people qp JOIN questions q ON q.id=qp.question_id WHERE qp.person_id=? AND q.publication_state='PUBLISHED' ORDER BY q.published_at DESC,q.question_text").bind(person.id).all<EntityQuestion>();
  return {...person,questions:questions.results??[]};
}

export async function findConcept(slug:string){
  const db=await knowledgeDb();
  const concept=await db.prepare("SELECT id,slug,canonical_name name,definition FROM concepts WHERE slug=?").bind(slug).first<{id:string;slug:string;name:string;definition:string}>();
  if(!concept)return null;
  const questions=await db.prepare("SELECT q.slug,q.question_text questionText,q.category_name category,COALESCE(q.verified_status,q.claimed_status) status,qc.contextual_definition association FROM question_concepts qc JOIN questions q ON q.id=qc.question_id WHERE qc.concept_id=? AND q.publication_state='PUBLISHED' ORDER BY q.published_at DESC,q.question_text").bind(concept.id).all<EntityQuestion>();
  return {...concept,questions:questions.results??[]};
}

export async function findSource(slug:string){
  const db=await knowledgeDb();
  const source=await db.prepare("SELECT id,slug,title,publisher,canonical_url url,source_type type FROM sources WHERE slug=?").bind(slug).first<{id:string;slug:string;title:string;publisher:string;url:string;type:string}>();
  if(!source)return null;
  const questions=await db.prepare("SELECT q.slug,q.question_text questionText,q.category_name category,COALESCE(q.verified_status,q.claimed_status) status,sc.purpose association FROM source_citations sc JOIN questions q ON q.id=sc.question_id WHERE sc.source_id=? AND q.publication_state='PUBLISHED' ORDER BY q.published_at DESC,q.question_text").bind(source.id).all<EntityQuestion>();
  return {...source,questions:questions.results??[]};
}
