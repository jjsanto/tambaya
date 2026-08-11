PRAGMA foreign_keys = ON;

DELETE FROM question_key_terms
WHERE description LIKE 'A recurring term in debates around%'
   OR description LIKE 'A recurring concept around%'
   OR description LIKE 'A recurring concept whose role%'
   OR description LIKE 'A central concept in this question%';
