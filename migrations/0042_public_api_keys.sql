CREATE TABLE public_api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT,
  revoked_at TEXT
);

CREATE INDEX idx_public_api_keys_user ON public_api_keys(user_id, created_at DESC);

CREATE TABLE public_api_usage (
  actor_key TEXT NOT NULL,
  api_key_id TEXT REFERENCES public_api_keys(id) ON DELETE SET NULL,
  usage_date TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (actor_key, usage_date, endpoint)
);

CREATE INDEX idx_public_api_usage_key_date ON public_api_usage(api_key_id, usage_date DESC);
