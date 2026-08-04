CREATE TABLE question_story_sections (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  kicker TEXT NOT NULL,
  title TEXT NOT NULL,
  provenance TEXT NOT NULL CHECK (provenance IN ('EDITORIAL','PUBLISHER','AI_ASSISTED')),
  answer_leak_state TEXT NOT NULL CHECK (answer_leak_state IN ('PASSED','PENDING','REJECTED')),
  reviewed_at TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  UNIQUE(question_id,section_key)
);
CREATE TABLE question_story_paragraphs (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES question_story_sections(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE person_associations (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  period TEXT NOT NULL,
  association TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE question_key_terms (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  description TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE question_branches (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('RELATED_TO','LEADS_TO','DEPENDS_ON','REFINES','GENERALIZES','CHALLENGES','PRECEDES')),
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_story_sections_question ON question_story_sections(question_id,position);
CREATE INDEX idx_story_paragraphs_section ON question_story_paragraphs(section_id,position);
CREATE INDEX idx_people_question ON person_associations(question_id,position);
CREATE INDEX idx_terms_question ON question_key_terms(question_id,position);
CREATE INDEX idx_branches_question ON question_branches(question_id,position);
