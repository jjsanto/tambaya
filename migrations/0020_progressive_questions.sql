ALTER TABLE questions ADD COLUMN publisher_motivation TEXT NOT NULL DEFAULT '';

INSERT OR IGNORE INTO categories (id,name,slug,description)
VALUES ('cat-uncategorised','Uncategorised','uncategorised','Questions awaiting a more precise editorial classification.');
