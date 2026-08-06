import { Agent, callable, type Connection } from 'agents'
import { z } from 'zod'

import {
	type Disposition,
	type Offer,
	type OfferContent,
	type OfferKind,
	offerContentSchema,
	type Ruling,
	rulings,
} from '../shared/offer'
import { emptyPlan, type Plan, planSchema, type Source } from '../shared/plan'

/** One Offer row as SQLite returns it. The column names are snake_case and the
 * source is a JSON string, so nothing here is handed to a client unmapped. */
type OfferRow = {
	id: string
	kind: string
	disposition: string
	text: string | null
	source: string | null
	note: string | null
	created_at: number
	decided_at: number | null
}

/** A row back into an Offer. The casts restate what `createOffer` parsed before
 * writing the row — this class is the only writer of the table. */
function toOffer(row: OfferRow): Offer {
	return {
		id: row.id,
		kind: row.kind as OfferKind,
		disposition: row.disposition as Disposition,
		text: row.text ?? undefined,
		source: row.source === null ? undefined : (JSON.parse(row.source) as Source),
		note: row.note ?? undefined,
		createdAt: row.created_at,
		decidedAt: row.decided_at,
	}
}

/**
 * One Article Agent per Article — docs/architecture.md §2, and §3 for what goes
 * in the state blob against what goes in its SQLite.
 */
export class ArticleAgent extends Agent<Env, Plan> {
	initialState = emptyPlan()

	/** Runs on every wake, including the wake after a hibernation. A later
	 * column arrives as another statement here rather than as an edit to this
	 * one, so an Article Agent that has been asleep for a month still migrates. */
	onStart(): void {
		this.sql`
			CREATE TABLE IF NOT EXISTS offer (
				id TEXT PRIMARY KEY,
				kind TEXT NOT NULL,
				disposition TEXT NOT NULL,
				text TEXT,
				source TEXT,
				note TEXT,
				created_at INTEGER NOT NULL,
				decided_at INTEGER
			)
		`
	}

	async onRequest(_request: Request): Promise<Response> {
		return Response.json({ agent: 'ArticleAgent', name: this.name })
	}

	/**
	 * The only guard on the blob. Every write is parsed, whatever its source:
	 * the client is the Plan's one writer, so a server write is already a bug.
	 *
	 * The Agents SDK answers a rejected client write with a fixed
	 * `cf_agent_state_error` string and logs the reason, so the message thrown
	 * here reaches the log rather than the writer.
	 */
	validateStateChange(nextState: Plan, _source: Connection | 'server'): void {
		const result = planSchema.safeParse(nextState)
		if (result.success) return

		throw new Error(`The Plan does not parse. ${z.prettifyError(result.error)}`)
	}

	/** Every Offer on this Article, oldest first. The Ledger filters by
	 * disposition and counts, and it does that over this list — it is a View
	 * over Offers rather than a store, and one Article's Offers are few. */
	listOffers(): Offer[] {
		return this.sql<OfferRow>`SELECT * FROM offer ORDER BY created_at, id`.map(toOffer)
	}

	/** Record something the Chat turned up. It starts Undecided. */
	createOffer(content: OfferContent): Offer {
		const offer: Offer = {
			...offerContentSchema.parse(content),
			id: crypto.randomUUID(),
			disposition: 'undecided',
			createdAt: Date.now(),
			decidedAt: null,
		}

		this.sql`
			INSERT INTO offer (id, kind, disposition, text, source, note, created_at, decided_at)
			VALUES (
				${offer.id},
				${offer.kind},
				${offer.disposition},
				${offer.text ?? null},
				${offer.source === undefined ? null : JSON.stringify(offer.source)},
				${offer.note ?? null},
				${offer.createdAt},
				${offer.decidedAt}
			)
		`

		return offer
	}

	/** Rule on an Offer: Accept it into the Plan, or Decline it. Accepting does
	 * not touch the Plan — the client copies the Offer in and keeps its
	 * Provenance (§3, rule 5). */
	setOfferDisposition(id: string, disposition: Ruling): Offer {
		const ruling = z.enum(rulings).parse(disposition)
		this.readOffer(id)

		this.sql`
			UPDATE offer SET disposition = ${ruling}, decided_at = ${Date.now()} WHERE id = ${id}
		`

		return this.readOffer(id)
	}

	/** Put a Declined Offer back to Undecided. Declining is restorable and
	 * nothing is deleted, so this is the undo of a Decline rather than a third
	 * ruling. */
	restoreOffer(id: string): Offer {
		const offer = this.readOffer(id)
		if (offer.disposition !== 'declined') {
			throw new Error(
				`Offer ${id} is ${offer.disposition}, and restoring undoes a Decline.`,
			)
		}

		this.sql`
			UPDATE offer SET disposition = 'undecided', decided_at = NULL WHERE id = ${id}
		`

		return this.readOffer(id)
	}

	private readOffer(id: string): Offer {
		const rows = this.sql<OfferRow>`SELECT * FROM offer WHERE id = ${id}`
		if (rows.length === 0) throw new Error(`No Offer carries the id ${id}.`)

		return toOffer(rows[0])
	}
}

/**
 * The four Offer methods a client may call over the socket it already holds.
 *
 * `@callable()` on the method is the SDK's own spelling and this build cannot
 * use it. Vite 8 bundles through oxc, which leaves a standard decorator in the
 * output, and workerd's V8 does not implement one — so the Worker fails to
 * parse rather than failing a test. The decorator's whole job is to register
 * the method function in the SDK's callable table, which is what calling it
 * here does. Replace this block with the decorators the day oxc lowers them.
 */
for (const method of [
	ArticleAgent.prototype.listOffers,
	ArticleAgent.prototype.createOffer,
	ArticleAgent.prototype.setOfferDisposition,
	ArticleAgent.prototype.restoreOffer,
] as ((...args: never[]) => unknown)[]) {
	callable()(method, {} as ClassMethodDecoratorContext)
}
