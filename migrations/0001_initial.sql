PRAGMA foreign_keys = ON;

CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, slug TEXT NOT NULL UNIQUE, description TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE questions (
  id TEXT PRIMARY KEY, publisher_id TEXT, question_text TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, language TEXT NOT NULL DEFAULT 'en',
  publication_state TEXT NOT NULL DEFAULT 'DRAFT' CHECK (publication_state IN ('DRAFT','PUBLISHED','ARCHIVED')),
  visibility TEXT NOT NULL DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC','PRIVATE','UNLISTED')),
  claimed_status TEXT NOT NULL CHECK (claimed_status IN ('ANSWERED','PARTIALLY_ANSWERED','OPEN')),
  verified_status TEXT CHECK (verified_status IN ('ANSWERED','PARTIALLY_ANSWERED','OPEN')),
  verification_state TEXT NOT NULL DEFAULT 'PENDING' CHECK (verification_state IN ('PENDING','VERIFIED','UNCERTAIN','CONTRADICTED','STALE')),
  verification_confidence REAL, last_verified_at TEXT, category_id TEXT REFERENCES categories(id), category_name TEXT,
  context_summary TEXT NOT NULL, importance_statement TEXT, image_key TEXT, public_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, published_at TEXT
);
CREATE TABLE question_contexts (question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE, origins TEXT NOT NULL, historical_background TEXT NOT NULL, why_people_started_asking TEXT NOT NULL, why_it_matters TEXT NOT NULL, where_it_appears TEXT NOT NULL, generated_by_ai INTEGER NOT NULL DEFAULT 0, reviewed_by_publisher INTEGER NOT NULL DEFAULT 1);
CREATE TABLE tags (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, slug TEXT NOT NULL UNIQUE);
CREATE TABLE question_tags (question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE, tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY(question_id,tag_id));
CREATE TABLE question_relationships (id TEXT PRIMARY KEY, source_question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE, target_question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE, source_slug TEXT NOT NULL, target_slug TEXT NOT NULL, relationship_type TEXT NOT NULL CHECK (relationship_type IN ('RELATED_TO','LEADS_TO','DEPENDS_ON','REFINES','GENERALIZES','CHALLENGES','PRECEDES')), created_by TEXT NOT NULL DEFAULT 'EDITORIAL', confidence REAL, verified INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, CHECK(source_question_id <> target_question_id), UNIQUE(source_question_id,target_question_id,relationship_type));
CREATE TABLE timeline_events (id TEXT PRIMARY KEY, question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE, display_date TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0);
CREATE TABLE question_references (id TEXT PRIMARY KEY, question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE, title TEXT NOT NULL, publisher TEXT, source_url TEXT NOT NULL, purpose TEXT NOT NULL CHECK (purpose IN ('HISTORICAL_CONTEXT','STATUS_VERIFICATION','ORIGIN','TIMELINE','BACKGROUND')));
CREATE VIRTUAL TABLE question_search USING fts5(question_id UNINDEXED, question_text, context_summary, category_name, tags);
CREATE INDEX idx_questions_public ON questions(publication_state, published_at DESC);
CREATE INDEX idx_questions_category ON questions(category_id, publication_state);
CREATE INDEX idx_relationships_source ON question_relationships(source_question_id);
CREATE INDEX idx_relationships_target ON question_relationships(target_question_id);
