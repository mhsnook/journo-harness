import { createContext, useContext } from 'react'

import type { Offer, Ruling } from '../../shared/offer'
import type { Plan } from '../../shared/plan'

/**
 * The seam one Article Agent arrives through, in two stores because the Plan
 * and the Offers are held apart on the server — architecture §3, rules 1 and 2.
 * `useAgent`'s typed stub satisfies `OfferStore` as it stands, so the route
 * passes `agent.stub` and writes no adapter.
 */

/** The Article Agent's three writer-facing `@callable` methods. */
export type OfferStore = {
	listOffers(): Promise<Offer[]>
	setOfferDisposition(id: string, ruling: Ruling): Promise<Offer>
	restoreOffer(id: string): Promise<Offer>
}

export type Article = {
	offers: OfferStore
	plan: Plan
	/** Replaces the whole blob, which is the only way to write it. */
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
