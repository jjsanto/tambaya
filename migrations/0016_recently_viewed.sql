CREATE TABLE user_question_views (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  view_count INTEGER NOT NULL DEFAULT 1,
  first_viewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_viewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id,question_id)
);
CREATE INDEX idx_question_views_user_recent ON user_question_views(user_id,last_viewed_at DESC);
