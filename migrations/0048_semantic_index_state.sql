CREATE TABLE question_semantic_index_state (
  question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  content_updated_at TEXT NOT NULL,
  indexed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  model TEXT NOT NULL
);
CREATE INDEX idx_semantic_index_stale ON question_semantic_index_state(content_updated_at,indexed_at);

-- The production index was verified to contain every currently published question
-- before this migration. Future changes are tracked explicitly by the indexer.
INSERT OR IGNORE INTO question_semantic_index_state(question_id,content_updated_at,model)
SELECT id,updated_at,'@cf/baai/bge-base-en-v1.5' FROM questions WHERE publication_state='PUBLISHED';
