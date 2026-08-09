-- The article index — docs/architecture.md §9. An Archived Article stays on this
-- table and says so with archived_at, rather than moving to one of its own.

CREATE TABLE article (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	status TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	archived_at INTEGER
);

-- The list reads in this order.
CREATE INDEX article_updated_at ON article (updated_at DESC);
