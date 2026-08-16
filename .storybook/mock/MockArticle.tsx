import { type ReactNode, useMemo, useState } from 'react'

import {
	ArticleProvider,
	type DraftStore,
	type OfferStore,
	useArticle,
} from '../../src/client/lib/article'
import { createPlanWriter } from '../../src/client/plan/writer'
import type { BlockRow, DraftChange } from '../../src/shared/draft'
import {
	missingOffer,
	notDeclined,
	type Offer,
	type Ruling,
} from '../../src/shared/offer'
import { emptyPlan, type Plan, type Refusal } from '../../src/shared/plan'
import { offers as seeded, plan as seededPlan } from './content'

/**
 * An Article held in memory, so a story runs the real Ledger and the real
 * applier without a Worker. Supplies the same two halves the Article Agent does,
 * behind the real `createPlanWriter` with a `send` that goes nowhere.
 */
export function MockArticle({ children }: { children: ReactNode }) {
	const [plan, setPlan] = useState<Plan>(seededPlan)
	const [refusal, setRefusal] = useState<Refusal | null>(null)

	// `send` goes nowhere, so the debounce is the only part that idles.
	const writer = useMemo(() => {
		const held = createPlanWriter({
			send: () => {},
			onPlan: setPlan,
			onRefusal: setRefusal,
		})
		held.receive(seededPlan)

		return held
	}, [])

	// One store per story, since `useOfferLedger` reads rows once per store and
	// `useDraft` loads once per store.
	const offers = useMemo(() => memoryOfferStore(seeded), [])
	const draft = useMemo(() => memoryDraftStore(), [])

	const edit = (next: Parameters<typeof writer.edit>[0]) => {
		setRefusal(null)

		return writer.edit(next)
	}

	return (
		<ArticleProvider
			value={{ offers, draft, plan: { plan, edit, refusal, rejected: null } }}
		>
			{children}
		</ArticleProvider>
	)
}

/**
 * The Plan a story is looking at. `MockArticle` seeds one before it renders, so
 * the empty fallback only satisfies the type. A Panel in the app gates on null
 * instead: it would otherwise draw the empty Plan as a real one, and a Proposal
 * card would name each of its Sections as missing.
 */
export function useMockPlan(): Plan {
	return useArticle().plan.plan ?? blank
}

const blank = emptyPlan()

/**
 * A Draft held in memory. `stall` leaves the load unanswered so a story can
 * show what the Panel does while it waits; `reject` refuses every save.
 */
export function memoryDraftStore(
	options: {
		seed?: readonly BlockRow[]
		stall?: boolean
		reject?: string
	} = {},
): DraftStore & { saves: DraftChange[] } {
	const rows = new Map((options.seed ?? []).map((row) => [row.id, { ...row }]))
	const saves: DraftChange[] = []

	return {
		saves,

		listBlocks: () =>
			options.stall === true
				? new Promise<BlockRow[]>(() => {})
				: Promise.resolve([...rows.values()].sort((a, b) => a.ord - b.ord)),

		saveBlocks: (change: DraftChange) => {
			saves.push(change)
			if (options.reject !== undefined) return Promise.reject(new Error(options.reject))

			for (const id of change.removed) rows.delete(id)
			for (const block of change.blocks) rows.set(block.id, { ...block })

			return Promise.resolve({
				savedAt: Date.now(),
				written: change.blocks.length,
				removed: change.removed.length,
			})
		},
	}
}

function memoryOfferStore(seed: readonly Offer[]): OfferStore {
	const rows = seed.map((offer) => ({ ...offer }))

	const find = (id: string): Offer => {
		const offer = rows.find((held) => held.id === id)
		if (offer === undefined) throw missingOffer(id)

		return offer
	}

	const rule = (
		offer: Offer,
		disposition: Offer['disposition'],
		decidedAt: number | null,
	) => {
		const ruled = { ...offer, disposition, decidedAt }
		rows.splice(rows.indexOf(offer), 1, ruled)

		return Promise.resolve(ruled)
	}

	return {
		listOffers: () => Promise.resolve(rows.map((offer) => ({ ...offer }))),

		setOfferDisposition: (id: string, ruling: Ruling) =>
			rule(find(id), ruling, Date.now()),

		restoreOffer: (id: string) => {
			const offer = find(id)
			if (offer.disposition !== 'declined') return Promise.reject(notDeclined(offer))

			return rule(offer, 'undecided', null)
		},
	}
}
