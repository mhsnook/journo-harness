import { AIChatAgent, type OnChatMessageOptions } from '@cloudflare/ai-chat'
import { callable, type Connection } from 'agents'
import { type GenerateTextOnFinishCallback, type LanguageModel, type ToolSet } from 'ai'
import { z } from 'zod'

import { chatRequestBody } from '../shared/chat'
import {
	type Disposition,
	missingOffer,
	notDeclined,
	type Offer,
	offerBatchSchema,
	offerFingerprint,
	type Ruling,
	rulingSchema,
} from '../shared/offer'
import {
	emptyPlan,
	type Plan,
	type PlanRefused,
	planSchema,
	type ReferenceContent,
	referenceContentSchema,
	type ReferenceType,
	type Source,
} from '../shared/plan'
import { chatTurn } from './llm/chat-turn'
import { model } from './llm/model'
import { webSearch, type WebSearch } from './llm/search'

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

/** `duplicate` means the row was already there and nothing was written. */
export type RecordedOffer = { offer: Offer; duplicate: boolean }

/**
 * One Article Agent per Article — docs/architecture.md §2, and §3 for what goes
 * in the state blob against what goes in its SQLite. `AIChatAgent` adds the
 * Chat: it keeps the transcript in its own SQLite tables, which nothing
 * mirrors, and routes a turn to `onChatMessage` below (§6).
 */
export class ArticleAgent extends AIChatAgent<Env, Plan> {
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

	/** The model a Chat turn runs on. Named for the Chat even though one model
	 * currently serves every call (§7): "model" alone does not say which of the
	 * app's several meanings is meant, and a Review or a Guide pass choosing its
	 * own model later is a likely enough change to leave room for.
	 *
	 * `llm/model.ts` is the boundary; this reads it so a workerd test, which has
	 * no Workers AI binding to reach, can put a scripted model behind it. */
	chatModel(): LanguageModel {
		return model(this.env)
	}

	/** How a Chat turn looks something up, or undefined where no search key is
	 * set — `llm/search.ts` is the boundary, and this reads it for the same
	 * reason `chatModel` reads the model one: a workerd test has no network to
	 * reach, and replaces this with a scripted search. */
	chatSearch(): WebSearch | undefined {
		return webSearch(this.env)
	}

	/**
	 * One Chat turn. `llm/chat-turn.ts` composes it; this supplies the three
	 * things only the Article Agent holds — the model, the Plan, and the
	 * transcript — and hands back the stream.
	 */
	async onChatMessage(
		onFinish: GenerateTextOnFinishCallback<ToolSet>,
		options?: OnChatMessageOptions,
	): Promise<Response> {
		return chatTurn({
			model: this.chatModel(),
			search: this.chatSearch(),
			plan: this.planForTurn(options?.body),
			messages: this.messages,
			abortSignal: options?.abortSignal,
			onFinish,
		})
	}

	/**
	 * The Plan the turn is about. The client sends it in `body`, never in
	 * `metadata`, which persists on the `UIMessage` and re-rides every turn
	 * (§6).
	 *
	 * **The body wins over state, and the two can disagree.** A client that
	 * applies a Proposal and sends the next turn before its `setState` lands
	 * holds a newer Plan than the Agent stored, and the turn should be about the
	 * one the writer is looking at. Nothing reconciles them, so the model can be
	 * shown a Plan this Agent never stored — which is correct here and is a fact
	 * #26 has to build for.
	 *
	 * An absent Plan is ordinary: a turn the client did not originate carries no
	 * body, and state is the only Plan there is. One that is present and does
	 * not parse is a bug, and refusing the turn is what says so.
	 */
	private planForTurn(body: Record<string, unknown> | undefined): Plan {
		const sent = chatRequestBody.safeParse(body ?? {})
		if (!sent.success) {
			// Same shape as validateStateChange: the frame carries which rule
			// failed, because whatever renders a thrown turn will not. It goes to
			// every connection rather than to one, since onChatMessage is not told
			// which of them sent the turn.
			const reason = z.prettifyError(sent.error)
			const refusal: PlanRefused = { type: 'plan_refused', error: reason }
			this.broadcast(JSON.stringify(refusal))

			throw new Error(`The Plan sent with this turn does not parse. ${reason}`)
		}

		return sent.data.plan ?? this.state
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
	 * One research turn. An entry this Article already carries comes back as it
	 * stands, keeping the disposition the writer gave it — §5.
	 *
	 * Not `@callable`, and neither is `createOffer`: the research tool is the
	 * only caller and it runs inside this Agent (§3, rule 4).
	 */
	recordOffers(batch: unknown): RecordedOffer[] {
		const found = offerBatchSchema.parse(batch)

		// Added to as the batch is written, so a turn dedupes against itself.
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

	/** Starts Undecided. */
	createOffer(content: ReferenceContent): Offer {
		const offer: Offer = {
			...referenceContentSchema.parse(content),
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
		if (offer.disposition !== 'declined') throw notDeclined(offer)

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
