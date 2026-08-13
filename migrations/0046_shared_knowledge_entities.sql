CREATE TABLE people (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  canonical_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  period TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE concepts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  canonical_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  definition TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  publisher TEXT NOT NULL DEFAULT '',
  canonical_url TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL DEFAULT 'REFERENCE' CHECK(source_type IN ('REFERENCE','ARTICLE','BOOK','PAPER','DATASET','ARCHIVE','WEBSITE')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE question_people (
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  association TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  provenance TEXT NOT NULL DEFAULT 'EDITORIAL',
  PRIMARY KEY(question_id,person_id)
);

CREATE TABLE question_concepts (
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  contextual_definition TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  provenance TEXT NOT NULL DEFAULT 'EDITORIAL',
  PRIMARY KEY(question_id,concept_id)
);

CREATE TABLE source_citations (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL DEFAULT 'QUESTION' CHECK(target_type IN ('QUESTION','STORY_SECTION','TIMELINE_EVENT','ANSWER_ATTEMPT','STATUS_EVENT','RELATIONSHIP')),
  target_id TEXT,
  purpose TEXT NOT NULL DEFAULT 'BACKGROUND',
  note TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  verified INTEGER NOT NULL DEFAULT 1,
  UNIQUE(question_id,source_id,target_type,target_id)
);

CREATE INDEX idx_question_people_person ON question_people(person_id,question_id);
CREATE INDEX idx_question_concepts_concept ON question_concepts(concept_id,question_id);
CREATE INDEX idx_source_citations_source ON source_citations(source_id,question_id);
CREATE INDEX idx_source_citations_target ON source_citations(question_id,target_type,target_id);

INSERT OR IGNORE INTO people(id,slug,canonical_name,normalized_name,period,bio)
SELECT 'person-'||lower(hex(randomblob(16))),
       lower(replace(replace(replace(trim(name),' ','-'),'.',''),'''',''))||'-'||lower(substr(hex(randomblob(4)),1,8)),
       trim(name),lower(trim(name)),max(period),max(association)
FROM person_associations GROUP BY lower(trim(name));

INSERT OR IGNORE INTO question_people(question_id,person_id,association,position)
SELECT pa.question_id,p.id,pa.association,pa.position
FROM person_associations pa JOIN people p ON p.normalized_name=lower(trim(pa.name));

INSERT OR IGNORE INTO concepts(id,slug,canonical_name,normalized_name,definition)
SELECT 'concept-'||lower(hex(randomblob(16))),
       lower(replace(replace(replace(trim(term),' ','-'),'.',''),'''',''))||'-'||lower(substr(hex(randomblob(4)),1,8)),
       trim(term),lower(trim(term)),max(description)
FROM question_key_terms GROUP BY lower(trim(term));

INSERT OR IGNORE INTO question_concepts(question_id,concept_id,contextual_definition,position)
SELECT qt.question_id,c.id,qt.description,qt.position
FROM question_key_terms qt JOIN concepts c ON c.normalized_name=lower(trim(qt.term));

INSERT OR IGNORE INTO sources(id,slug,title,publisher,canonical_url,source_type)
SELECT 'source-'||lower(hex(randomblob(16))),
       'source-'||lower(substr(hex(randomblob(12)),1,16)),
       max(title),max(COALESCE(publisher,'')),trim(source_url),'REFERENCE'
FROM question_references WHERE source_url LIKE 'https://%' GROUP BY trim(source_url);

INSERT OR IGNORE INTO source_citations(id,question_id,source_id,target_type,target_id,purpose,position)
SELECT 'citation-'||lower(hex(randomblob(16))),qr.question_id,s.id,'QUESTION','',qr.purpose,
       row_number() OVER(PARTITION BY qr.question_id ORDER BY qr.rowid)
FROM question_references qr JOIN sources s ON s.canonical_url=trim(qr.source_url);

CREATE TRIGGER sync_person_entity_after_insert AFTER INSERT ON person_associations BEGIN
  INSERT OR IGNORE INTO people(id,slug,canonical_name,normalized_name,period,bio)
  VALUES('person-'||lower(hex(randomblob(16))),lower(replace(replace(replace(trim(NEW.name),' ','-'),'.',''),'''',''))||'-'||lower(substr(hex(randomblob(4)),1,8)),trim(NEW.name),lower(trim(NEW.name)),NEW.period,NEW.association);
  INSERT OR REPLACE INTO question_people(question_id,person_id,association,position)
  SELECT NEW.question_id,id,NEW.association,NEW.position FROM people WHERE normalized_name=lower(trim(NEW.name));
END;

CREATE TRIGGER sync_person_entity_after_delete AFTER DELETE ON person_associations BEGIN
  DELETE FROM question_people WHERE question_id=OLD.question_id AND person_id IN (SELECT id FROM people WHERE normalized_name=lower(trim(OLD.name)));
END;

CREATE TRIGGER sync_concept_entity_after_insert AFTER INSERT ON question_key_terms BEGIN
  INSERT OR IGNORE INTO concepts(id,slug,canonical_name,normalized_name,definition)
  VALUES('concept-'||lower(hex(randomblob(16))),lower(replace(replace(replace(trim(NEW.term),' ','-'),'.',''),'''',''))||'-'||lower(substr(hex(randomblob(4)),1,8)),trim(NEW.term),lower(trim(NEW.term)),NEW.description);
  INSERT OR REPLACE INTO question_concepts(question_id,concept_id,contextual_definition,position)
  SELECT NEW.question_id,id,NEW.description,NEW.position FROM concepts WHERE normalized_name=lower(trim(NEW.term));
END;

CREATE TRIGGER sync_concept_entity_after_delete AFTER DELETE ON question_key_terms BEGIN
  DELETE FROM question_concepts WHERE question_id=OLD.question_id AND concept_id IN (SELECT id FROM concepts WHERE normalized_name=lower(trim(OLD.term)));
END;

CREATE TRIGGER sync_source_entity_after_insert AFTER INSERT ON question_references WHEN NEW.source_url LIKE 'https://%' BEGIN
  INSERT OR IGNORE INTO sources(id,slug,title,publisher,canonical_url,source_type)
  VALUES('source-'||lower(hex(randomblob(16))),'source-'||lower(substr(hex(randomblob(12)),1,16)),NEW.title,COALESCE(NEW.publisher,''),trim(NEW.source_url),'REFERENCE');
  INSERT OR REPLACE INTO source_citations(id,question_id,source_id,target_type,target_id,purpose,position)
  SELECT 'citation-'||lower(hex(randomblob(16))),NEW.question_id,id,'QUESTION','',NEW.purpose,0 FROM sources WHERE canonical_url=trim(NEW.source_url);
END;

CREATE TRIGGER sync_source_entity_after_delete AFTER DELETE ON question_references BEGIN
  DELETE FROM source_citations WHERE question_id=OLD.question_id AND source_id IN (SELECT id FROM sources WHERE canonical_url=trim(OLD.source_url)) AND target_type='QUESTION' AND target_id='';
END;
