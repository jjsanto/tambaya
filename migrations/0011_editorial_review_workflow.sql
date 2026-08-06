CREATE TABLE submission_events (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('PUBLISHER','EDITORIAL','SYSTEM')),
  event_type TEXT NOT NULL CHECK (event_type IN ('DRAFT_CREATED','DRAFT_SAVED','SUBMITTED','CHANGES_REQUESTED','RESUBMITTED','APPROVED','PUBLISHED')),
  note TEXT,
  snapshot_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_submission_events_question ON submission_events(question_id,created_at DESC);

CREATE TABLE editorial_comments (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  block_position INTEGER,
  body TEXT NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0 CHECK (resolved IN (0,1)),
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_editorial_comments_question ON editorial_comments(question_id,resolved,created_at);

CREATE TABLE question_uploads (
  object_key TEXT PRIMARY KEY,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  question_id TEXT REFERENCES questions(id) ON DELETE SET NULL,
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_question_uploads_owner ON question_uploads(owner_id,created_at);
CREATE INDEX idx_question_uploads_question ON question_uploads(question_id);
