ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE','PREMIUM'));

CREATE TABLE premium_ai_generations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  model TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('GENERATED','REJECTED','FAILED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_premium_generations_user_date ON premium_ai_generations(user_id,created_at DESC);
