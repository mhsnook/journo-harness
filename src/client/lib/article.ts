import { createContext, useContext } from 'react'

import type { BlockRow, DraftChange, DraftSaved } from '../../shared/draft'
import type { Offer, Ruling } from '../../shared/offer'
import type { PlanConnection } from '../plan/usePlan'

/**
 * The seam one Article Agent arrives through, in stores because the server
 * holds the Plan and its rows apart — §3, rules 1 and 2. `useArticleAgent`
 * builds it; the Panels read it.
 */

/** The Article Agent's writer-facing `@callable` methods. */
export type OfferStore = {
	listOffers(): Promise<Offer[]>
	setOfferDisposition(id: string, ruling: Ruling): Promise<Offer>
	restoreOffer(id: string): Promise<Offer>
}

export type DraftStore = {
	listBlocks(): Promise<BlockRow[]>
	saveBlocks(change: DraftChange): Promise<DraftSaved>
}

export type Article = {
	offers: OfferStore
	draft: DraftStore
	plan: PlanConnection
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
