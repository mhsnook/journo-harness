import { createContext, useContext } from 'react'

import type { Offer, Ruling } from '../../shared/offer'
import { emptyPlan, type Plan } from '../../shared/plan'
import type { PlanConnection } from '../plan/usePlan'

/**
 * The seam one Article Agent arrives through, in two stores because the Plan and
 * the Offers are held apart on the server — §3, rules 1 and 2. Both halves are
 * shaped as `usePlanChannel` and `useAgent`'s stub already return them.
 *
 * One Provider per Article, above every Panel, because one Article Agent means
 * one socket: `useArticleAgent` builds this and the Panels read it.
 */

/** The Article Agent's three writer-facing `@callable` methods. */
export type OfferStore = {
	listOffers(): Promise<Offer[]>
	setOfferDisposition(id: string, ruling: Ruling): Promise<Offer>
	restoreOffer(id: string): Promise<Offer>
}

export type Article = {
	offers: OfferStore
	/** The Plan, and the one writer every Plan edit goes through. */
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

/**
 * The Plan on screen, and an empty one while the first state update is still in
 * flight. A list reads the empty Plan as an empty list, which is what a new
 * Article holds anyway — the Panel that must say "Opening the Plan…" rather
 * than draw an empty one reads `plan.plan` and gates on null itself.
 */
export function useArticlePlan(): Plan {
	return useArticle().plan.plan ?? opening
}

/** One instance, so a render while the socket settles is not a new Plan every
 * time. Nothing writes to it: the writer works on a copy. */
const opening = emptyPlan()
