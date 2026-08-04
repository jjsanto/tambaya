-- Public content is assembled from normalized records from this migration onward.
-- questions.public_json remains only for backwards-compatible migration of the Phase 1 smoke row.
ALTER TABLE questions ADD COLUMN featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0,1));
ALTER TABLE question_references ADD COLUMN position INTEGER NOT NULL DEFAULT 0;

CREATE TABLE question_content_sections (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL CHECK (section_type IN ('SUMMARY','ORIGINS','EVOLUTION','WHY_ASKED','WHY_IT_MATTERS','WHERE_IT_APPEARS')),
  body TEXT NOT NULL,
  provenance TEXT NOT NULL CHECK (provenance IN ('EDITORIAL','PUBLISHER','AI_ASSISTED')),
  publication_state TEXT NOT NULL DEFAULT 'DRAFT' CHECK (publication_state IN ('DRAFT','PUBLISHED','REJECTED')),
  answer_leak_state TEXT NOT NULL DEFAULT 'PENDING' CHECK (answer_leak_state IN ('PASSED','PENDING','REJECTED')),
  answer_leak_risk REAL,
  answer_leak_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(question_id,section_type)
);

CREATE INDEX idx_content_sections_public ON question_content_sections(question_id,publication_state,position);

INSERT OR IGNORE INTO question_content_sections (id,question_id,section_type,body,provenance,publication_state,answer_leak_state,reviewed_at,position)
SELECT 'section-' || id || '-summary',id,'SUMMARY',context_summary,'EDITORIAL','PUBLISHED','PASSED','2026-08-04',0 FROM questions WHERE publication_state='PUBLISHED';
INSERT OR IGNORE INTO question_content_sections (id,question_id,section_type,body,provenance,publication_state,answer_leak_state,reviewed_at,position)
SELECT 'section-' || question_id || '-origins',question_id,'ORIGINS',origins,'EDITORIAL','PUBLISHED','PASSED','2026-08-04',1 FROM question_contexts;
INSERT OR IGNORE INTO question_content_sections (id,question_id,section_type,body,provenance,publication_state,answer_leak_state,reviewed_at,position)
SELECT 'section-' || question_id || '-why-asked',question_id,'WHY_ASKED',why_people_started_asking,'EDITORIAL','PUBLISHED','PASSED','2026-08-04',3 FROM question_contexts;
INSERT OR IGNORE INTO question_content_sections (id,question_id,section_type,body,provenance,publication_state,answer_leak_state,reviewed_at,position)
SELECT 'section-' || question_id || '-why-matters',question_id,'WHY_IT_MATTERS',why_it_matters,'EDITORIAL','PUBLISHED','PASSED','2026-08-04',4 FROM question_contexts;
INSERT OR IGNORE INTO question_content_sections (id,question_id,section_type,body,provenance,publication_state,answer_leak_state,reviewed_at,position)
SELECT 'section-' || question_id || '-where',question_id,'WHERE_IT_APPEARS',where_it_appears,'EDITORIAL','PUBLISHED','PASSED','2026-08-04',5 FROM question_contexts;
