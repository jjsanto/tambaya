ALTER TABLE questions ADD COLUMN public_id TEXT;

UPDATE questions
SET public_id = 'TQ-' || upper(substr(hex(randomblob(8)), 1, 12))
WHERE public_id IS NULL;

CREATE UNIQUE INDEX idx_questions_public_id ON questions(public_id);

CREATE TABLE question_slug_aliases (
  slug TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  retired_at TEXT
);

INSERT OR IGNORE INTO question_slug_aliases(slug, question_id)
SELECT slug, id FROM questions;

CREATE INDEX idx_question_slug_aliases_question ON question_slug_aliases(question_id);

CREATE TABLE question_categories (
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0,1)),
  position INTEGER NOT NULL DEFAULT 0,
  assigned_by TEXT NOT NULL DEFAULT 'EDITORIAL' CHECK(assigned_by IN ('MIGRATION','PUBLISHER','EDITORIAL','AI_ASSISTED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(question_id, category_id)
);

CREATE UNIQUE INDEX idx_question_categories_one_primary
ON question_categories(question_id) WHERE is_primary=1;
CREATE INDEX idx_question_categories_category ON question_categories(category_id, is_primary, question_id);

INSERT OR IGNORE INTO question_categories(question_id, category_id, is_primary, position, assigned_by)
SELECT id, category_id, 1, 0, 'MIGRATION' FROM questions WHERE category_id IS NOT NULL;

CREATE TABLE question_status_events (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  occurred_at TEXT NOT NULL,
  from_status TEXT CHECK(from_status IN ('ANSWERED','PARTIALLY_ANSWERED','OPEN')),
  to_status TEXT NOT NULL CHECK(to_status IN ('ANSWERED','PARTIALLY_ANSWERED','OPEN')),
  evidence_url TEXT,
  verifier_type TEXT NOT NULL DEFAULT 'EDITORIAL' CHECK(verifier_type IN ('MIGRATION','EDITORIAL','INSTITUTION','SYSTEM')),
  verifier_name TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_question_status_events_question_time
ON question_status_events(question_id, occurred_at DESC, created_at DESC);

INSERT INTO question_status_events(id, question_id, occurred_at, from_status, to_status, verifier_type, note)
SELECT lower(hex(randomblob(16))), id, COALESCE(last_verified_at, published_at, updated_at, created_at), NULL,
       COALESCE(verified_status, claimed_status), 'MIGRATION',
       'Baseline imported from the pre-history Tambaya record; this is not evidence of a historical transition.'
FROM questions
WHERE COALESCE(verified_status, claimed_status) IS NOT NULL;
