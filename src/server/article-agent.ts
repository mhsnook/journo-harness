import { Agent, callable, type Connection } from 'agents'
import { z } from 'zod'

import {
	type Disposition,
	type Offer,
	offerBatchSchema,
	offerFingerprint,
	type OfferMaterial,
	offerMaterialSchema,
	type Ruling,
	rulingSchema,
} from '../shared/offer'
import {
	emptyPlan,
	type Plan,
	type ReferenceType,
	type PlanRefused,
	planSchema,
	type Source,
} from '../shared/plan'

/** One Offer row as SQLite returns it. `this.sql` asserts the row type rather
 * than checking it, and this class is the table's only writer, so the columns
 * are stated as what `createOffer` parsed before writing them. */
type OfferRow = {
	seq: number
	id: string
	type: ReferenceType
	disposition: Disposition
	text: string | null
	source: string | null
	note: string | null
	created_at: number
	decided_at: number | null
}

function toOffer(row: OfferRow): Offer {
	return {
		id: row.id,
		type: row.type,
		disposition: row.disposition,
		text: row.text ?? undefined,
		source: row.source === null ? undefined : (JSON.parse(row.source) as Source),
		note: row.note ?? undefined,
		createdAt: row.created_at,
		decidedAt: row.decided_at,
	}
}

function missingOffer(id: string): Error {
	return new Error(`No Offer carries the id ${id}.`)
}

/** One entry of a research turn, once the Article Agent has placed it.
 * `duplicate` says the row was already there and nothing was written. */
export type RecordedOffer = { offer: Offer; duplicate: boolean }

/**
 * One Article Agent per Article — docs/architecture.md §2, and §3 for what goes
 * in the state blob against what goes in its SQLite.
 */
export class ArticleAgent extends Agent<Env, Plan> {
	initialState = emptyPlan()

	/** Runs on every wake, so every statement here has to be idempotent. A new
	 * table can join this one. A new column cannot — SQLite has no ADD COLUMN
	 * IF NOT EXISTS, so the second wake throws on a duplicate column. */
	onStart(): void {
		this.sql`
			CREATE TABLE IF NOT EXISTS offer (
				seq INTEGER PRIMARY KEY AUTOINCREMENT,
				id TEXT NOT NULL UNIQUE,
				type TEXT NOT NULL,
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
	 */
	validateStateChange(nextState: Plan, source: Connection | 'server'): void {
		const result = planSchema.safeParse(nextState)
		if (result.success) return

		const reason = z.prettifyError(result.error)
		if (source !== 'server') {
			const refusal: PlanRefused = { type: 'plan_refused', error: reason }
			source.send(JSON.stringify(refusal))
		}

		throw new Error(`The Plan does not parse. ${reason}`)
	}

	/** Every Offer on this Article, in the order they were recorded.
	 *
	 * `seq` orders it, not `created_at`: a Worker's clock does not advance
	 * across local writes, so a research turn that records four Offers stamps
	 * them with one or two milliseconds between them. */
	@callable()
	listOffers(): Offer[] {
		return this.sql<OfferRow>`SELECT * FROM offer ORDER BY seq`.map(toOffer)
	}

	/**
	 * Record what one research turn turned up, and answer with what the writer
	 * will see. An entry this Article already carries comes back as it stands,
	 * marked a duplicate and written nowhere: the same source next session is
	 * the same Offer, still holding the disposition the writer gave it, and its
	 * Provenance is what says where it went in the Plan.
	 *
	 * Not `@callable`, and neither is `createOffer` below: the writer never
	 * authors an Offer, so the Chat's research tool is the only caller and it
	 * runs inside this Agent (§3, rule 4).
	 */
	recordOffers(batch: unknown): RecordedOffer[] {
		const found = offerBatchSchema.parse(batch)

		// Built once and added to as the batch is written, so one turn offering
		// the same source twice records it once.
		const held = new Map(
			this.listOffers().map((offer) => [offerFingerprint(offer), offer]),
		)

		return found.map((material) => {
			const fingerprint = offerFingerprint(material)
			const already = held.get(fingerprint)
			if (already !== undefined) return { offer: already, duplicate: true }

			const offer = this.createOffer(material)
			held.set(fingerprint, offer)

			return { offer, duplicate: false }
		})
	}

	/** Record one thing the Chat turned up. It starts Undecided. */
	createOffer(material: OfferMaterial): Offer {
		const offer: Offer = {
			...offerMaterialSchema.parse(material),
			id: crypto.randomUUID(),
			disposition: 'undecided',
			createdAt: Date.now(),
			decidedAt: null,
		}

		this.sql`
			INSERT INTO offer (id, type, disposition, text, source, note, created_at, decided_at)
			VALUES (
				${offer.id},
				${offer.type},
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

	/** Mark an Offer as having been Accepted or Declined by the client. */
	@callable()
	setOfferDisposition(id: string, disposition: Ruling): Offer {
		const ruling = rulingSchema.parse(disposition)

		const rows = this.sql<OfferRow>`
			UPDATE offer SET disposition = ${ruling}, decided_at = ${Date.now()}
			WHERE id = ${id} RETURNING *
		`
		if (rows.length === 0) throw missingOffer(id)

		return toOffer(rows[0])
	}

	/** Restore a Declined Offer back to Undecided. */
	@callable()
	restoreOffer(id: string): Offer {
		// Read first: an Offer that is Accepted and one that does not exist have
		// to be told apart, and one conditional UPDATE cannot do that.
		const offer = this.readOffer(id)
		if (offer.disposition !== 'declined') {
			throw new Error(
				`Offer ${id} is ${offer.disposition}, and restoring undoes a Decline.`,
			)
		}

		const rows = this.sql<OfferRow>`
			UPDATE offer SET disposition = 'undecided', decided_at = NULL
			WHERE id = ${id} RETURNING *
		`

		return toOffer(rows[0])
	}

	private readOffer(id: string): Offer {
		const rows = this.sql<OfferRow>`SELECT * FROM offer WHERE id = ${id}`
		if (rows.length === 0) throw missingOffer(id)

		return toOffer(rows[0])
	}
}
