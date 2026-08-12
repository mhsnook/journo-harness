import type { DistilledRules, LearnedRule } from '../../shared/learning'
import type { Disposition, Ruling } from '../../shared/offer'

/**
 * Learned rules in D1 — docs/architecture.md §12.
 *
 * Writer-scoped rather than per-Article, because a preference is the writer's
 * and one Article carries far too few rulings to read one off. They belong to
 * the House once the House exists at 1b; D1 is where writer-scoped material
 * lives until then, and the move is a data migration rather than a redesign.
 */

type LearnedRuleRow = {
	id: string
	text: string
	basis: string
	observed: number
	disposition: Disposition
	created_at: number
	decided_at: number | null
}

const columns = 'id, text, basis, observed, disposition, created_at, decided_at'

function toRule(row: LearnedRuleRow): LearnedRule {
	return {
		id: row.id,
		text: row.text,
		basis: row.basis,
		observed: row.observed,
		disposition: row.disposition,
		createdAt: row.created_at,
		decidedAt: row.decided_at,
	}
}

/** Every Learned rule, newest first, whatever the writer decided. The Views
 * filter, the way the article index sends whole. */
export async function listRules(db: D1Database): Promise<LearnedRule[]> {
	const rows = await db
		.prepare(`SELECT ${columns} FROM learned_rule ORDER BY created_at DESC`)
		.all<LearnedRuleRow>()

	return rows.results.map(toRule)
}

/**
 * The rules a Chat turn is given, in the order they were learned.
 *
 * Accepted only. A candidate the writer has not read yet has no business
 * steering the guide, and that is the whole difference between this and a model
 * that quietly retrains on its own output.
 */
export async function acceptedRules(db: D1Database): Promise<LearnedRule[]> {
	const rows = await db
		.prepare(
			`SELECT ${columns} FROM learned_rule
			 WHERE disposition = 'accepted' ORDER BY created_at`,
		)
		.all<LearnedRuleRow>()

	return rows.results.map(toRule)
}

/**
 * What the writer has already turned down, so the next pass can be shown it.
 *
 * Without this a pass reads the same rulings and offers the same rejected
 * reading every time, and the writer declines it again forever.
 */
export async function declinedRules(db: D1Database): Promise<LearnedRule[]> {
	const rows = await db
		.prepare(
			`SELECT ${columns} FROM learned_rule
			 WHERE disposition = 'declined' ORDER BY created_at`,
		)
		.all<LearnedRuleRow>()

	return rows.results.map(toRule)
}

/** Write what one pass produced. Every rule starts Undecided, like an Offer. */
export async function recordRules(
	db: D1Database,
	distilled: DistilledRules,
	observed: number,
): Promise<LearnedRule[]> {
	if (distilled.rules.length === 0) return []

	const now = Date.now()
	const rules: LearnedRule[] = distilled.rules.map((rule) => ({
		id: crypto.randomUUID(),
		text: rule.text,
		basis: rule.basis,
		observed,
		disposition: 'undecided',
		createdAt: now,
		decidedAt: null,
	}))

	const insert = db.prepare(
		`INSERT INTO learned_rule (${columns}) VALUES (?, ?, ?, ?, ?, ?, ?)`,
	)

	await db.batch(
		rules.map((rule) =>
			insert.bind(
				rule.id,
				rule.text,
				rule.basis,
				rule.observed,
				rule.disposition,
				rule.createdAt,
				rule.decidedAt,
			),
		),
	)

	return rules
}

/** Accept or Decline one. Answers null when no rule carries the id, which the
 * route turns into a 404. */
export async function setRuleDisposition(
	db: D1Database,
	id: string,
	ruling: Ruling,
): Promise<LearnedRule | null> {
	const row = await db
		.prepare(
			`UPDATE learned_rule SET disposition = ?, decided_at = ?
			 WHERE id = ? RETURNING ${columns}`,
		)
		.bind(ruling, Date.now(), id)
		.first<LearnedRuleRow>()

	return row === null ? null : toRule(row)
}

/** Restore a Declined rule to Undecided — the same restore an Offer has, and
 * Accepted is left alone for the same reason: restoring undoes a Decline. */
export async function restoreRule(
	db: D1Database,
	id: string,
): Promise<LearnedRule | null> {
	const row = await db
		.prepare(
			`UPDATE learned_rule SET disposition = 'undecided', decided_at = NULL
			 WHERE id = ? AND disposition = 'declined' RETURNING ${columns}`,
		)
		.bind(id)
		.first<LearnedRuleRow>()

	return row === null ? null : toRule(row)
}
