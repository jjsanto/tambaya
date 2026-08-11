PRAGMA foreign_keys = ON;

-- Keep the generated records recoverable for editorial audit, but remove the
-- semantically repetitive batch from every public discovery surface.
UPDATE questions
SET publication_state = 'ARCHIVED', updated_at = CURRENT_TIMESTAMP
WHERE id LIKE 'bulk-2026-%';

DELETE FROM question_search WHERE question_id LIKE 'bulk-2026-%';
DELETE FROM question_relationships WHERE id LIKE 'bulk-rel-%';
