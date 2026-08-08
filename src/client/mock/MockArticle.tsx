import { type ReactNode, useMemo, useState } from 'react'

import { missingOffer, notDeclined, type Offer, type Ruling } from '../../shared/offer'
import { emptyPlan, type Plan, type Refusal } from '../../shared/plan'
import { ArticleProvider, type OfferStore, useArticle } from '../lib/article'
import { createPlanWriter } from '../plan/writer'
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

	// One store per story, since `useOfferLedger` reads rows once per store.
	const offers = useMemo(() => memoryOfferStore(seeded), [])

	const edit = (next: Parameters<typeof writer.edit>[0]) => {
		setRefusal(null)

		return writer.edit(next)
	}

	return (
		<ArticleProvider value={{ offers, plan: { plan, edit, refusal, rejected: null } }}>
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
