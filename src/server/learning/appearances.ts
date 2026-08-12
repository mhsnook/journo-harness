import type { Disposition } from '../../shared/offer'
import type { PolicyTally } from '../../shared/research'

/**
 * The appearance table in D1 — docs/architecture.md §12.
 *
 * **The Article Agent is the record and this is the copy.** Every write here is
 * best effort: a lost one costs a row to learn from and nothing else, where a
 * lost ruling would cost the writer their decision. So a failure is caught at
 * the Agent and never reaches the writer, and `appearanceId` is built from the
 * Article, the batch, and the position so re-mirroring an Article replaces its
 * rows rather than doubling them.
 *
 * Nothing here reads an Article Agent. That is the point: a query across every
 * Article's rulings would otherwise have to wake every Article Agent there is.
 */

/** One appearance as it is written, with the Offer's own fields flattened onto
 * it — see the migration for why they ride along. */
export type AppearanceRecord = {
	articleId: string
	batchId: string
	policy: string
	position: number
	duplicate: boolean
	offerId: string
	type: string
	text?: string
	source?: unknown
	note?: string
	disposition: Disposition
	offeredAt: number
	decidedAt: number | null
}

/** One ruled Offer as the distillation reads it. */
export type RuledAppearance = {
	policy: string
	type: string
	text: string | null
	source: string | null
	note: string | null
	disposition: Disposition
}

/** Built rather than random, so writing the same appearance twice replaces it.
 * The batch id is already unique across Articles; the Article is in the key
 * anyway, because reading a key that names its Article is worth the bytes. */
function appearanceId(record: AppearanceRecord): string {
	return `${record.articleId}:${record.batchId}:${record.position}`
}

const columns =
	'id, article_id, batch_id, policy, position, duplicate, offer_id, type, text, source, note, disposition, offered_at, decided_at'

/**
 * Mirror what one research turn put in front of the writer.
 *
 * `INSERT OR REPLACE` rather than `INSERT`: the Agent may re-mirror an Article
 * to repair a write that was lost, and a second run has to be a no-op.
 */
export async function recordAppearances(
	db: D1Database,
	records: readonly AppearanceRecord[],
): Promise<void> {
	if (records.length === 0) return

	const insert = db.prepare(
		`INSERT OR REPLACE INTO appearance (${columns})
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	)

	await db.batch(
		records.map((record) =>
			insert.bind(
				appearanceId(record),
				record.articleId,
				record.batchId,
				record.policy,
				record.position,
				record.duplicate ? 1 : 0,
				record.offerId,
				record.type,
				record.text ?? null,
				record.source === undefined ? null : JSON.stringify(record.source),
				record.note ?? null,
				record.disposition,
				record.offeredAt,
				record.decidedAt,
			),
		),
	)
}

/**
 * A ruling landed. It reaches every appearance of that Offer, because a source
 * two policies both turned up was turned up by both of them — crediting only
 * the batch that got there first would score a policy on its luck.
 */
export async function markRuling(
	db: D1Database,
	articleId: string,
	offerId: string,
	disposition: Disposition,
	decidedAt: number | null,
): Promise<void> {
	await db
		.prepare(
			`UPDATE appearance SET disposition = ?, decided_at = ?
			 WHERE article_id = ? AND offer_id = ?`,
		)
		.bind(disposition, decidedAt, articleId, offerId)
		.run()
}

/** What SQLite hands back from the tally query. `SUM` over no rows is null,
 * which is why every count is read through `?? 0` below. */
type TallyRow = {
	policy: string
	batches: number
	offered: number
	distinct_offers: number
	duplicates: number | null
	accepted: number
	declined: number
	undecided: number
}

/**
 * What each policy has turned up and what became of it — the report that says
 * which research routine is worth keeping.
 *
 * The ruling counts are over distinct Offers where `offered` is over
 * appearances, so a policy that surfaces one good source five times reports
 * five offered and one accepted rather than five of each.
 */
export async function policyTallies(db: D1Database): Promise<PolicyTally[]> {
	const rows = await db
		.prepare(
			`SELECT
				policy,
				COUNT(DISTINCT batch_id) AS batches,
				COUNT(*) AS offered,
				COUNT(DISTINCT offer_id) AS distinct_offers,
				SUM(duplicate) AS duplicates,
				COUNT(DISTINCT CASE WHEN disposition = 'accepted' THEN offer_id END) AS accepted,
				COUNT(DISTINCT CASE WHEN disposition = 'declined' THEN offer_id END) AS declined,
				COUNT(DISTINCT CASE WHEN disposition = 'undecided' THEN offer_id END) AS undecided
			 FROM appearance
			 GROUP BY policy
			 ORDER BY policy`,
		)
		.all<TallyRow>()

	return rows.results.map((row) => {
		const ruled = row.accepted + row.declined

		return {
			policy: row.policy,
			batches: row.batches,
			offered: row.offered,
			distinct: row.distinct_offers,
			duplicates: row.duplicates ?? 0,
			accepted: row.accepted,
			declined: row.declined,
			undecided: row.undecided,
			acceptRate: ruled === 0 ? null : row.accepted / ruled,
		}
	})
}

/**
 * The ruled Offers a distillation pass reads, newest first.
 *
 * Undecided ones are left out, and that is the one filter here that carries a
 * claim: an Undecided Offer is not a Decline. A writer who ruled on six of
 * seventeen left eleven unread, and handing those over as negatives would teach
 * the pass that everything below the fold is bad.
 *
 * One row per Offer rather than per appearance, so a source three policies all
 * turned up does not weigh three times.
 */
export async function ruledAppearances(
	db: D1Database,
	limit: number,
): Promise<RuledAppearance[]> {
	const rows = await db
		.prepare(
			`SELECT policy, type, text, source, note, disposition
			 FROM appearance
			 WHERE disposition != 'undecided'
			 GROUP BY article_id, offer_id
			 ORDER BY decided_at DESC
			 LIMIT ?`,
		)
		.bind(limit)
		.all<RuledAppearance>()

	return rows.results
}

/** How many ruled Offers there are, so a pass can say what it read rather than
 * counting the rows it was handed after a limit cut them off. */
export async function ruledCount(db: D1Database): Promise<number> {
	const row = await db
		.prepare(
			`SELECT COUNT(*) AS ruled FROM (
				SELECT 1 FROM appearance WHERE disposition != 'undecided'
				GROUP BY article_id, offer_id
			)`,
		)
		.first<{ ruled: number }>()

	return row?.ruled ?? 0
}
