-- The article index — docs/architecture.md §9, issue #29.
--
-- One row per Article, holding what a list needs to render a row and nothing
-- that duplicates the Plan. The Article Agent stays the source of truth for an
-- Article, so dropping this table costs the reader their list and costs no
-- Article anything.
--
-- An Archived Article stays on this table and says so with archived_at, rather
-- than moving to a table of its own.

CREATE TABLE article (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	status TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	archived_at INTEGER
);

-- The list reads in this order, newest change first.
CREATE INDEX article_updated_at ON article (updated_at DESC);
