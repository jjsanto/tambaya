ALTER TABLE questions ADD COLUMN submission_state TEXT CHECK (submission_state IN ('DRAFT','SUBMITTED','CHANGES_REQUESTED','APPROVED'));
ALTER TABLE questions ADD COLUMN review_notes TEXT;
ALTER TABLE questions ADD COLUMN submitted_at TEXT;
ALTER TABLE questions ADD COLUMN reviewed_at TEXT;

CREATE INDEX idx_questions_publisher_submissions ON questions(publisher_id,submission_state,updated_at DESC);
