ALTER TABLE questions ADD COLUMN editorial_outcome TEXT CHECK (editorial_outcome IN ('REJECTED'));
ALTER TABLE questions ADD COLUMN rejected_at TEXT;

ALTER TABLE submission_events RENAME TO submission_events_legacy;
CREATE TABLE submission_events (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('PUBLISHER','EDITORIAL','SYSTEM')),
  event_type TEXT NOT NULL CHECK (event_type IN ('DRAFT_CREATED','DRAFT_SAVED','SUBMITTED','CHANGES_REQUESTED','RESUBMITTED','APPROVED','PUBLISHED','REJECTED')),
  note TEXT,
  snapshot_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO submission_events (id,question_id,actor_type,event_type,note,snapshot_json,created_at)
SELECT id,question_id,actor_type,event_type,note,snapshot_json,created_at FROM submission_events_legacy;
DROP TABLE submission_events_legacy;
CREATE INDEX idx_submission_events_question ON submission_events(question_id,created_at DESC);
