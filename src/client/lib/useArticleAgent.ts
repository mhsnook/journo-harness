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
	// One ref, read by both halves: the client is replaced on every reconnect, and
	// an `OfferStore` or a writer that closed over one generation would keep
	// sending to a socket that is gone.
	const socket = useRef<ArticleSocket | null>(null)
	const channel = usePlanChannel(() => socket.current)

	const agent = useAgent<Plan>({
		agent: 'article-agent',
		name: articleId,
		onStateUpdate: channel.onStateUpdate,
		onMessage: channel.onMessage,
	})

	useEffect(() => {
		socket.current = agent
	})

	// `[]`, so the store keeps its identity across reconnects: the Ledger reads
	// its rows once per store, and a new one on every render would re-read them.
	const offers = useMemo<OfferStore>(
		() => ({
			listOffers: () => call<Offer[]>(socket, 'listOffers'),
			setOfferDisposition: (id: string, ruling: Ruling) =>
				call<Offer>(socket, 'setOfferDisposition', [id, ruling]),
			restoreOffer: (id: string) => call<Offer>(socket, 'restoreOffer', [id]),
		}),
		[],
	)

	return { article: { offers, plan: channel.connection }, agent }
}

/** An RPC on whichever socket is current. The first render has none, and a
 * caller reaching one that early is a bug rather than a state to render. */
function call<T>(
	socket: { current: ArticleSocket | null },
	method: string,
	args?: unknown[],
): Promise<T> {
	if (socket.current === null) {
		return Promise.reject(new Error('The Article Agent is not connected yet.'))
	}

	return socket.current.call<T>(method, args)
}
