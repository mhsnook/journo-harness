-- What the writer's rulings add up to, across every Article — docs/architecture.md §10.
--
-- The Article Agent is the record of one Article's Offers, and it can only ever
-- answer for that one Article. These two tables are writer-scoped, which is the
-- scope a preference is actually held at: one Article's rulings are far too few
-- to read anything off, and the whole point is the writer's taste rather than
-- this piece's.

-- One Offer as one batch surfaced it, copied out of the Article Agent that owns
-- it. The Offer's own fields ride along, so reading this table needs no Agent
-- awake and no fan-out across every Article.
--
-- The id is built rather than random — article, batch, and position — so a
-- mirror that runs twice replaces the row instead of writing a second one. That
-- is what makes re-mirroring a whole Article safe, which is the repair path when
-- a write below is lost.
CREATE TABLE appearance (
	id TEXT PRIMARY KEY,
	article_id TEXT NOT NULL,
	batch_id TEXT NOT NULL,
	policy TEXT NOT NULL,
	position INTEGER NOT NULL,
	duplicate INTEGER NOT NULL,
	offer_id TEXT NOT NULL,
	type TEXT NOT NULL,
	text TEXT,
	source TEXT,
	note TEXT,
	disposition TEXT NOT NULL,
	offered_at INTEGER NOT NULL,
	decided_at INTEGER
);

-- Comparing policies is the query this table exists for.
CREATE INDEX appearance_policy ON appearance (policy);

-- A ruling updates every appearance of the Offer it ruled on, in whichever
-- batches surfaced it.
CREATE INDEX appearance_offer ON appearance (article_id, offer_id);

-- The distillation reads what the writer has ruled on, newest first.
CREATE INDEX appearance_decided_at ON appearance (decided_at DESC);

-- What a distillation pass read off the rulings, for the writer to Accept or
-- Decline. An Accepted Learned rule joins the guide's instructions on every
-- turn; a Declined one stays as the record of a reading the writer rejected, so
-- the next pass can be shown it and not offer it again.
--
-- `observed` is how many ruled appearances the pass was given. A rule read off
-- eleven rulings and a rule read off four hundred are not the same claim, and
-- the writer deciding is the one who should see which they have.
CREATE TABLE learned_rule (
	id TEXT PRIMARY KEY,
	text TEXT NOT NULL,
	basis TEXT NOT NULL,
	observed INTEGER NOT NULL,
	disposition TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	decided_at INTEGER
);

-- Every turn reads the Accepted ones.
CREATE INDEX learned_rule_disposition ON learned_rule (disposition, created_at);
