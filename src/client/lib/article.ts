import { createContext, useContext } from 'react'

import type { Offer, Ruling } from '../../shared/offer'
import type { Plan } from '../../shared/plan'
import type { PlanEdit } from '../plan/writer'

/**
 * The seam one Article Agent arrives through, in two stores because the Plan
 * and the Offers are held apart on the server — architecture §3, rules 1 and 2.
 * The Plan half is the shape `usePlan` returns and the Offers half is the shape
 * `useAgent`'s typed stub already has, so the route passes both straight
 * through and writes no adapter.
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
	/** Apply an edit, in the op vocabulary every other Plan write uses. Takes
	 * the null a builder returns for an edit with nowhere to go, and a builder
	 * for an edit that has to read the Plan as it stands. */
	edit: (edit: PlanEdit) => void
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
