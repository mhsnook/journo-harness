import { type ReactNode, useMemo, useState } from 'react'

import { missingOffer, notDeclined, type Offer, type Ruling } from '../../shared/offer'
import type { Plan } from '../../shared/plan'
import { ArticleProvider, type OfferStore } from '../lib/article'
import { articlePlan, offers as seeded } from './content'

/**
 * An Article held in memory, so a story exercises the real Offer ledger without
 * a Worker. It answers the same three methods the Article Agent exposes over
 * RPC, and the route that connects the real one swaps this provider for
 * `useAgent`.
 */
export function MockArticle({ children }: { children: ReactNode }) {
	const [plan, setPlan] = useState<Plan>(articlePlan)

	// One store for the life of the story: the Ledger reads its rows once, the
	// way it will read them when a Panel opens.
	const offers = useMemo(() => memoryOfferStore(seeded), [])

	return <ArticleProvider value={{ offers, plan, setPlan }}>{children}</ArticleProvider>
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
