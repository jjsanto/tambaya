CREATE TABLE editorial_revisions (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('STORY_SAVED','PUBLISHED')),
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_editorial_revisions_question ON editorial_revisions(question_id,created_at DESC);
