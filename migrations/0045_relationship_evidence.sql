ALTER TABLE question_relationships ADD COLUMN evidence_url TEXT;
ALTER TABLE question_relationships ADD COLUMN evidence_note TEXT NOT NULL DEFAULT '';
ALTER TABLE question_relationships ADD COLUMN discovery_method TEXT NOT NULL DEFAULT 'EDITORIAL';

