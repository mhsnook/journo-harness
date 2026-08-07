import { type ReactNode, useMemo, useState } from 'react'

import { missingOffer, notDeclined, type Offer, type Ruling } from '../../shared/offer'
import type { Plan, ProposalInput } from '../../shared/plan'
import { applyProposal } from '../../shared/plan'
import { ArticleProvider, type OfferStore } from '../lib/article'
import { offers as seeded, plan as seededPlan } from './content'

/**
 * An Article held in memory, so a story exercises the real Offer ledger without
 * a Worker. It answers the same three methods the Article Agent exposes over
 * RPC and applies edits through the same applier, so what a story shows is what
 * the Panel does.
 *
 * What it leaves out is what only the socket needs: `usePlan` debounces its
 * writes and surfaces a refusal, and there is neither a wire to spare nor a
 * place to show one here.
 */
export function MockArticle({ children }: { children: ReactNode }) {
	const [plan, setPlan] = useState<Plan>(seededPlan)

	// One store for the life of the story: the Ledger reads its rows once, the
	// way it will read them when a Panel opens.
	const offers = useMemo(() => memoryOfferStore(seeded), [])

	const edit = (ops: ProposalInput | null) => {
		if (ops === null) return

		setPlan((held) => {
			const result = applyProposal(held, ops)

			return result.ok ? result.plan : held
		})
	}

	return <ArticleProvider value={{ offers, plan, edit }}>{children}</ArticleProvider>
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
