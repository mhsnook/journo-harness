import { useAgent } from 'agents/react'
import { useEffect, useMemo, useRef } from 'react'

import type { Offer, Ruling } from '../../shared/offer'
import type { Plan } from '../../shared/plan'
import { usePlanChannel } from '../plan/usePlan'
import type { Article, OfferStore } from './article'

/**
 * One Article Agent, one socket, held above the Panels — docs/architecture.md
 * §8. The socket is multiplexed: it carries the Plan blob, the `@callable` RPC
 * the Offers are read over, and the Chat turn, all on one wire. Two Panels
 * opening their own would mean two Plan writers against a blob that may only
 * have one (§3, rule 1).
 *
 * Mounting this and laying the Panels out is issue #29. What it returns is the
 * `ArticleProvider`'s value plus the socket itself, which is what
 * `useAgentChat` takes.
 */

export type ArticleSocket = ReturnType<typeof useAgent<Plan>>

export type ArticleConnection = {
	article: Article
	agent: ArticleSocket
}

export function useArticleAgent(articleId: string): ArticleConnection {
	const channel = usePlanChannel()

	const agent = useAgent<Plan>({
		agent: 'article-agent',
		name: articleId,
		onStateUpdate: channel.onStateUpdate,
		onMessage: channel.onMessage,
	})

	// Held rather than closed over: the client is replaced on every reconnect,
	// and an `OfferStore` that changed identity with it would make the Ledger
	// re-read its rows on every render.
	const socket = useRef(agent)
	useEffect(() => {
		socket.current = agent
		channel.attach(agent)
	})

	const offers = useMemo<OfferStore>(
		() => ({
			listOffers: () => socket.current.call<Offer[]>('listOffers'),
			setOfferDisposition: (id: string, ruling: Ruling) =>
				socket.current.call<Offer>('setOfferDisposition', [id, ruling]),
			restoreOffer: (id: string) => socket.current.call<Offer>('restoreOffer', [id]),
		}),
		[],
	)

	return { article: { offers, plan: channel.connection }, agent }
}
