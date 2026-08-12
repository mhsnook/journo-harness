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
import {
	defaultResearchPolicy,
	type OfferBatch,
	researchPolicySchema,
} from '../shared/research'
import { migrateAgentSchema } from './agent-schema'
import {
	type AppearanceRecord,
	markRuling,
	recordAppearances,
} from './learning/appearances'
import { acceptedRules } from './learning/rules'
import { chatTurn } from './llm/chat-turn'
import { model } from './llm/model'

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

/** One batch row as SQLite returns it. */
type OfferBatchRow = {
	seq: number
	id: string
	policy: string
	created_at: number
	offered: number
}

function toBatch(row: OfferBatchRow): OfferBatch {
	return {
		id: row.id,
		policy: row.policy,
		createdAt: row.created_at,
		offered: row.offered,
	}
}

/** `duplicate` means the row was already there and nothing was written. */
export type RecordedOffer = { offer: Offer; duplicate: boolean }

/** What one research turn recorded: the batch it was, and what it surfaced in
 * the order the writer sees them. */
export type RecordedBatch = { batch: OfferBatch; recorded: RecordedOffer[] }

/** One appearance as D1 holds it — the Offer's own fields flattened onto the
 * batch that surfaced it, so a query there wakes no Article Agent. */
function appearanceOf(
	articleId: string,
	batch: OfferBatch,
	offer: Offer,
	position: number,
	duplicate: boolean,
): AppearanceRecord {
	return {
		articleId,
		batchId: batch.id,
		policy: batch.policy,
		position,
		duplicate,
		offerId: offer.id,
		type: offer.type,
		text: offer.text,
		source: offer.source,
		note: offer.note,
		disposition: offer.disposition,
		// The batch's clock rather than the Offer's: a re-offer keeps the row it
		// already had, and when it was first turned up is not when this turn
		// showed it.
		offeredAt: batch.createdAt,
		decidedAt: offer.decidedAt,
	}
}

function appearancesOf(
	articleId: string,
	batch: OfferBatch,
	recorded: readonly RecordedOffer[],
): AppearanceRecord[] {
	return recorded.map((entry, position) =>
		appearanceOf(articleId, batch, entry.offer, position, entry.duplicate),
	)
}

/**
 * One Article Agent per Article — docs/architecture.md §2, and §3 for what goes
 * in the state blob against what goes in its SQLite. `AIChatAgent` adds the
 * Chat: it keeps the transcript in its own SQLite tables, which nothing
 * mirrors, and routes a turn to `onChatMessage` below (§6).
 */
export class ArticleAgent extends AIChatAgent<Env, Plan> {
	initialState = emptyPlan()

	/** Runs on every wake. The schema and the steps that build it are in
	 * `agent-schema.ts`, which records how far this Agent has got — so a step
	 * runs once rather than having to be safe to run on every wake. */
	onStart(): void {
		migrateAgentSchema(this.ctx)
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
			plan: this.planForTurn(options?.body),
			messages: this.messages,
			abortSignal: options?.abortSignal,
			onFinish,
			rules: await this.learnedRules(),
		})
	}

	/**
	 * The Accepted Learned rules, for this turn's prompt — §12.
	 *
	 * Read here rather than in `chatTurn`, which reaches no binding by design.
	 * A failure answers none rather than failing the turn: a guide running
	 * without the rules is the guide as it was last month, where a turn that
	 * will not start is the writer's Chat broken.
	 */
	private async learnedRules(): Promise<string[]> {
		try {
			return (await acceptedRules(this.env.DB)).map((rule) => rule.text)
		} catch (error) {
			console.error('The Learned rules did not load. The turn runs without them.', error)

			return []
		}
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

	/** Every research turn this Article has had, oldest first. Read-only, so it
	 * joins the callable set: what a turn turned up is the writer's to look at.
	 *
	 * `seq` orders it rather than `created_at`, the same way `listOffers` is
	 * ordered and for the same reason — the clock does not move between two
	 * writes in one invocation. */
	@callable()
	listOfferBatches(): OfferBatch[] {
		return this.sql<OfferBatchRow>`SELECT * FROM offer_batch ORDER BY seq`.map(toBatch)
	}

	/**
	 * One research turn. An entry this Article already carries comes back as it
	 * stands, keeping the disposition the writer gave it — §5.
	 *
	 * The turn is recorded as a **batch** with one **appearance** per entry, so
	 * what the writer was shown survives as a set rather than as a scattering of
	 * rows with nearby timestamps — §12. The duplicates get appearances too: an
	 * Offer already on the table writes no second row, and without the
	 * appearance a policy that turned up a source the writer had already taken
	 * would leave no sign it had turned it up.
	 *
	 * **The policy is named by the harness, never by the model.** It defaults to
	 * the one routine there is; at 1b a House Skill names its own.
	 *
	 * Not `@callable`, and neither is `createOffer`: the research tool is the
	 * only caller and it runs inside this Agent (§3, rule 4).
	 */
	async recordOffers(
		batch: unknown,
		policy: string = defaultResearchPolicy,
	): Promise<RecordedBatch> {
		// Both parsed before any row is written, so a bad policy refuses the turn
		// where it would otherwise leave a batch labelled with nothing.
		const found = offerBatchSchema.parse(batch)
		const named = researchPolicySchema.parse(policy)

		// Added to as the batch is written, so a turn dedupes against itself.
		const held = new Map(
			this.listOffers().map((offer) => [offerFingerprint(offer), offer]),
		)

		const recorded = found.map((material) => {
			const fingerprint = offerFingerprint(material)
			const already = held.get(fingerprint)
			if (already !== undefined) return { offer: already, duplicate: true }

			const offer = this.createOffer(material)
			held.set(fingerprint, offer)

			return { offer, duplicate: false }
		})

		const written = this.createBatch(named, recorded)
		await this.mirror(() =>
			recordAppearances(this.env.DB, appearancesOf(this.name, written, recorded)),
		)

		return { batch: written, recorded }
	}

	/** The batch row and its appearances, in the order the writer sees them. */
	private createBatch(policy: string, recorded: readonly RecordedOffer[]): OfferBatch {
		const batch: OfferBatch = {
			id: crypto.randomUUID(),
			policy,
			createdAt: Date.now(),
			offered: recorded.length,
		}

		this.sql`
			INSERT INTO offer_batch (id, policy, created_at, offered)
			VALUES (${batch.id}, ${batch.policy}, ${batch.createdAt}, ${batch.offered})
		`

		recorded.forEach((entry, position) => {
			this.sql`
				INSERT INTO offer_appearance (batch_id, offer_id, position, duplicate)
				VALUES (${batch.id}, ${entry.offer.id}, ${position}, ${entry.duplicate ? 1 : 0})
			`
		})

		return batch
	}

	/**
	 * Copy this Article's rulings into D1, where a query can read across every
	 * Article — §12. Answers how many appearances it wrote.
	 *
	 * The repair path for a mirror write that was lost. The ids are built from
	 * the Article, the batch, and the position, so running this twice replaces
	 * rows rather than doubling them.
	 */
	@callable()
	async syncAppearances(): Promise<number> {
		const offers = new Map(this.listOffers().map((offer) => [offer.id, offer]))
		const batches = this.listOfferBatches()

		let written = 0
		for (const batch of batches) {
			const rows = this.sql<{ offer_id: string; position: number; duplicate: number }>`
				SELECT offer_id, position, duplicate FROM offer_appearance
				WHERE batch_id = ${batch.id} ORDER BY position
			`

			const records = rows.flatMap((row) => {
				const offer = offers.get(row.offer_id)
				// An appearance naming an Offer no longer on the table would be a
				// bug rather than a state to handle, and skipping it keeps the
				// repair path from failing whole on one bad row.
				if (offer === undefined) return []

				return [appearanceOf(this.name, batch, offer, row.position, row.duplicate === 1)]
			})

			await this.mirror(() => recordAppearances(this.env.DB, records))
			written += records.length
		}

		return written
	}

	/**
	 * A write to the copy in D1.
	 *
	 * **Best effort, and deliberately so.** This Agent is the record; D1 holds
	 * the copy a query reads across Articles. A failure here costs one row to
	 * learn from, where letting it through would cost the writer the ruling they
	 * just made — so it is logged and swallowed, and `syncAppearances` is how it
	 * gets repaired.
	 *
	 * Awaited rather than handed to `waitUntil`: the write is one small
	 * statement, and awaiting is what lets a test assert the copy landed.
	 */
	private async mirror(write: () => Promise<void>): Promise<void> {
		try {
			await write()
		} catch (error) {
			console.error(
				'An appearance did not reach D1. The Article Agent kept its row.',
				error,
			)
		}
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
	async setOfferDisposition(id: string, disposition: Ruling): Promise<Offer> {
		const ruling = rulingSchema.parse(disposition)

		const rows = this.sql<OfferRow>`
			UPDATE offer SET disposition = ${ruling}, decided_at = ${Date.now()}
			WHERE id = ${id} RETURNING *
		`
		if (rows.length === 0) throw missingOffer(id)

		const offer = toOffer(rows[0])
		// Every appearance of it, not just the batch that got there first: a
		// source two policies both turned up was turned up by both.
		await this.mirror(() =>
			markRuling(this.env.DB, this.name, offer.id, offer.disposition, offer.decidedAt),
		)

		return offer
	}

	/** Restore a Declined Offer back to Undecided. */
	@callable()
	async restoreOffer(id: string): Promise<Offer> {
		// Read first: an Offer that is Accepted and one that does not exist have
		// to be told apart, and one conditional UPDATE cannot do that.
		const held = this.readOffer(id)
		if (held.disposition !== 'declined') throw notDeclined(held)

		const rows = this.sql<OfferRow>`
			UPDATE offer SET disposition = 'undecided', decided_at = NULL
			WHERE id = ${id} RETURNING *
		`

		const offer = toOffer(rows[0])
		await this.mirror(() =>
			markRuling(this.env.DB, this.name, offer.id, offer.disposition, offer.decidedAt),
		)

		return offer
	}

	private readOffer(id: string): Offer {
		const rows = this.sql<OfferRow>`SELECT * FROM offer WHERE id = ${id}`
		if (rows.length === 0) throw missingOffer(id)

		return toOffer(rows[0])
	}
}
