CREATE TABLE question_story_blocks (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES question_story_sections(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL CHECK (block_type IN ('PARAGRAPH','HEADING','IMAGE','TABLE','LIST','QUOTE','CALLOUT')),
  data_json TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  answer_leak_state TEXT NOT NULL DEFAULT 'PENDING' CHECK (answer_leak_state IN ('PASSED','PENDING','REJECTED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_story_blocks_section ON question_story_blocks(section_id,position);

INSERT INTO question_story_blocks (id,section_id,block_type,data_json,position,answer_leak_state)
SELECT 'block-' || id,section_id,'PARAGRAPH',json_object('text',body),position,'PASSED'
FROM question_story_paragraphs;
