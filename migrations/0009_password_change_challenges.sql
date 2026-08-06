CREATE TABLE password_change_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_change_challenges_user ON password_change_challenges(user_id);
CREATE INDEX idx_password_change_challenges_expiry ON password_change_challenges(expires_at);
