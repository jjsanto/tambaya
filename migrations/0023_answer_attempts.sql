CREATE TABLE question_answer_attempts (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  publisher TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL,
  publication_date TEXT NOT NULL DEFAULT '',
  approach TEXT NOT NULL,
  scope TEXT NOT NULL,
  significance TEXT NOT NULL,
  unresolved TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_question_answer_attempts_question
  ON question_answer_attempts(question_id, verified, position);
