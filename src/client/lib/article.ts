import { createContext, useContext } from 'react'

import type { Offer, Ruling } from '../../shared/offer'
import type { Plan } from '../../shared/plan'

/**
 * What one Article screen reads and writes, and the seam the Article Agent
 * arrives through. Two stores, because the Plan and the Offers are held apart
 * on the server — docs/architecture.md §3, rules 1 and 2.
 */

/**
 * The Article Agent's three writer-facing `@callable` methods, and nothing
 * else. `createOffer` is absent because the writer never authors an Offer.
 *
 * `useAgent`'s typed stub satisfies this as it stands, so the route wiring it
 * up (#29) passes `agent.stub` and writes no adapter.
 */
export type OfferStore = {
	listOffers(): Promise<Offer[]>
	setOfferDisposition(id: string, ruling: Ruling): Promise<Offer>
	restoreOffer(id: string): Promise<Offer>
}

export type Article = {
	offers: OfferStore
	plan: Plan
	/** Replaces the whole blob, which is the only way to write it. The client is
	 * the Plan's one writer — §3, rule 1. */
	setPlan: (plan: Plan) => void
}

const ArticleContext = createContext<Article | null>(null)

export const ArticleProvider = ArticleContext.Provider

export function useArticle(): Article {
	const article = useContext(ArticleContext)
	if (article === null) {
		throw new Error('An Article screen needs an ArticleProvider above it.')
	}

	return article
}
