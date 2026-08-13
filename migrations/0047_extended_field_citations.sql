INSERT OR IGNORE INTO sources(id,slug,title,publisher,canonical_url,source_type)
SELECT 'source-'||lower(hex(randomblob(16))),'source-'||lower(substr(hex(randomblob(12)),1,16)),max(title),max(COALESCE(publisher,'')),trim(source_url),'PAPER'
FROM question_answer_attempts WHERE verified=1 AND source_url LIKE 'https://%' GROUP BY trim(source_url);

INSERT OR IGNORE INTO source_citations(id,question_id,source_id,target_type,target_id,purpose,note,position,verified)
SELECT 'citation-'||lower(hex(randomblob(16))),a.question_id,s.id,'ANSWER_ATTEMPT',a.id,'STATUS_VERIFICATION',a.significance,a.position,1
FROM question_answer_attempts a JOIN sources s ON s.canonical_url=trim(a.source_url)
WHERE a.verified=1 AND a.source_url LIKE 'https://%';

INSERT OR IGNORE INTO sources(id,slug,title,publisher,canonical_url,source_type)
SELECT 'source-'||lower(hex(randomblob(16))),'source-'||lower(substr(hex(randomblob(12)),1,16)),'Status evidence for '||max(q.question_text),'',trim(e.evidence_url),'REFERENCE'
FROM question_status_events e JOIN questions q ON q.id=e.question_id
WHERE e.evidence_url LIKE 'https://%' GROUP BY trim(e.evidence_url);

INSERT OR IGNORE INTO source_citations(id,question_id,source_id,target_type,target_id,purpose,note,position,verified)
SELECT 'citation-'||lower(hex(randomblob(16))),e.question_id,s.id,'STATUS_EVENT',e.id,'STATUS_VERIFICATION',COALESCE(e.note,''),0,1
FROM question_status_events e JOIN sources s ON s.canonical_url=trim(e.evidence_url)
WHERE e.evidence_url LIKE 'https://%';

INSERT OR IGNORE INTO sources(id,slug,title,publisher,canonical_url,source_type)
SELECT 'source-'||lower(hex(randomblob(16))),'source-'||lower(substr(hex(randomblob(12)),1,16)),'Relationship evidence: '||max(q.question_text),'',trim(r.evidence_url),'REFERENCE'
FROM question_relationships r JOIN questions q ON q.id=r.source_question_id
WHERE r.verified=1 AND r.evidence_url LIKE 'https://%' GROUP BY trim(r.evidence_url);

INSERT OR IGNORE INTO source_citations(id,question_id,source_id,target_type,target_id,purpose,note,position,verified)
SELECT 'citation-'||lower(hex(randomblob(16))),r.source_question_id,s.id,'RELATIONSHIP',r.id,'BACKGROUND',COALESCE(r.evidence_note,r.rationale,''),0,1
FROM question_relationships r JOIN sources s ON s.canonical_url=trim(r.evidence_url)
WHERE r.verified=1 AND r.evidence_url LIKE 'https://%';

CREATE TRIGGER sync_attempt_citation_after_insert AFTER INSERT ON question_answer_attempts WHEN NEW.verified=1 AND NEW.source_url LIKE 'https://%' BEGIN
  INSERT OR IGNORE INTO sources(id,slug,title,publisher,canonical_url,source_type) VALUES('source-'||lower(hex(randomblob(16))),'source-'||lower(substr(hex(randomblob(12)),1,16)),NEW.title,COALESCE(NEW.publisher,''),trim(NEW.source_url),'PAPER');
  INSERT OR REPLACE INTO source_citations(id,question_id,source_id,target_type,target_id,purpose,note,position,verified) SELECT 'citation-'||lower(hex(randomblob(16))),NEW.question_id,id,'ANSWER_ATTEMPT',NEW.id,'STATUS_VERIFICATION',NEW.significance,NEW.position,1 FROM sources WHERE canonical_url=trim(NEW.source_url);
END;
CREATE TRIGGER sync_attempt_citation_after_delete AFTER DELETE ON question_answer_attempts BEGIN DELETE FROM source_citations WHERE target_type='ANSWER_ATTEMPT' AND target_id=OLD.id; END;

CREATE TRIGGER sync_status_citation_after_insert AFTER INSERT ON question_status_events WHEN NEW.evidence_url LIKE 'https://%' BEGIN
  INSERT OR IGNORE INTO sources(id,slug,title,publisher,canonical_url,source_type) SELECT 'source-'||lower(hex(randomblob(16))),'source-'||lower(substr(hex(randomblob(12)),1,16)),'Status evidence for '||question_text,'',trim(NEW.evidence_url),'REFERENCE' FROM questions WHERE id=NEW.question_id;
  INSERT OR REPLACE INTO source_citations(id,question_id,source_id,target_type,target_id,purpose,note,position,verified) SELECT 'citation-'||lower(hex(randomblob(16))),NEW.question_id,id,'STATUS_EVENT',NEW.id,'STATUS_VERIFICATION',COALESCE(NEW.note,''),0,1 FROM sources WHERE canonical_url=trim(NEW.evidence_url);
END;

CREATE TRIGGER sync_relationship_citation_after_insert AFTER INSERT ON question_relationships WHEN NEW.verified=1 AND NEW.evidence_url LIKE 'https://%' BEGIN
  INSERT OR IGNORE INTO sources(id,slug,title,publisher,canonical_url,source_type) SELECT 'source-'||lower(hex(randomblob(16))),'source-'||lower(substr(hex(randomblob(12)),1,16)),'Relationship evidence: '||question_text,'',trim(NEW.evidence_url),'REFERENCE' FROM questions WHERE id=NEW.source_question_id;
  INSERT OR REPLACE INTO source_citations(id,question_id,source_id,target_type,target_id,purpose,note,position,verified) SELECT 'citation-'||lower(hex(randomblob(16))),NEW.source_question_id,id,'RELATIONSHIP',NEW.id,'BACKGROUND',COALESCE(NEW.evidence_note,NEW.rationale,''),0,1 FROM sources WHERE canonical_url=trim(NEW.evidence_url);
END;
CREATE TRIGGER sync_relationship_citation_after_delete AFTER DELETE ON question_relationships BEGIN DELETE FROM source_citations WHERE target_type='RELATIONSHIP' AND target_id=OLD.id; END;
