CREATE TABLE external_editorial_proposals (
  question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  specification_json TEXT NOT NULL,
  agent_name TEXT NOT NULL DEFAULT '',
  model_name TEXT NOT NULL DEFAULT '',
  protocol_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_external_editorial_proposals_updated
  ON external_editorial_proposals(updated_at DESC);
