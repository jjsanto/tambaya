CREATE TABLE question_phrasings (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  period TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  source_url TEXT,
  source_title TEXT,
  note TEXT,
  verified INTEGER NOT NULL DEFAULT 0 CHECK(verified IN (0,1)),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_question_phrasings_question ON question_phrasings(question_id,verified,position);

ALTER TABLE question_answer_attempts ADD COLUMN outcome_type TEXT
CHECK(outcome_type IN ('PARTIAL','DISPUTED','SUPERSEDED','ABANDONED','ONGOING'));
ALTER TABLE question_answer_attempts ADD COLUMN outcome_note TEXT;

CREATE TABLE question_answer_attempt_people (
  answer_attempt_id TEXT NOT NULL REFERENCES question_answer_attempts(id) ON DELETE CASCADE,
  person_association_id TEXT NOT NULL REFERENCES person_associations(id) ON DELETE CASCADE,
  role TEXT,
  PRIMARY KEY(answer_attempt_id,person_association_id)
);
