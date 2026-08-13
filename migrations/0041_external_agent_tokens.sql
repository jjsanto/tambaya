CREATE TABLE external_agent_tokens (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  scopes TEXT NOT NULL DEFAULT 'brief:read,proposal:write',
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_external_agent_tokens_question ON external_agent_tokens(question_id,created_at DESC);
CREATE TABLE external_agent_requests (
  id TEXT PRIMARY KEY,
  token_id TEXT NOT NULL REFERENCES external_agent_tokens(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_external_agent_requests_rate ON external_agent_requests(token_id,created_at DESC);
