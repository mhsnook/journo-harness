import { type ReactNode, useMemo, useState } from 'react'

import { missingOffer, notDeclined, type Offer, type Ruling } from '../../shared/offer'
import type { Plan } from '../../shared/plan'
import { ArticleProvider, type OfferStore } from '../lib/article'
import { createPlanWriter } from '../plan/writer'
import { offers as seeded, plan as seededPlan } from './content'

/**
 * An Article held in memory, so a story runs the real Ledger and the real
 * applier without a Worker. A refusal has nowhere to go here, where `usePlan`
 * surfaces one.
 */
export function MockArticle({ children }: { children: ReactNode }) {
	const [plan, setPlan] = useState<Plan>(seededPlan)

	// The real writer, without a socket: only `send` is debounced.
	const writer = useMemo(() => {
		const held = createPlanWriter({ send: () => {}, onPlan: setPlan })
		held.receive(seededPlan)

		return held
	}, [])

	// One store per story: the Ledger reads its rows once.
	const offers = useMemo(() => memoryOfferStore(seeded), [])

	return (
		<ArticleProvider value={{ offers, plan, edit: writer.edit }}>
			{children}
		</ArticleProvider>
	)
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
