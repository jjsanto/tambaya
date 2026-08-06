CREATE TABLE user_question_follows (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id,question_id)
);
CREATE TABLE user_category_follows (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id,category_id)
);
CREATE INDEX idx_question_follows_question ON user_question_follows(question_id,created_at DESC);
CREATE INDEX idx_category_follows_category ON user_category_follows(category_id,created_at DESC);
