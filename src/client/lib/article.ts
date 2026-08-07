import { createContext, useContext } from 'react'

import type { Offer, Ruling } from '../../shared/offer'
import type { Plan } from '../../shared/plan'
import type { PlanEdit } from '../plan/writer'

/**
 * The seam one Article Agent arrives through, in two stores because the Plan and
 * the Offers are held apart on the server — §3, rules 1 and 2. Both halves are
 * shaped as `usePlan` and `useAgent`'s stub already return them.
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
	/** The op vocabulary every other Plan write uses. */
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
