import { useAgent } from 'agents/react'
import { useMemo, useRef } from 'react'

import type { Offer, Ruling } from '../../shared/offer'
import type { Plan } from '../../shared/plan'
import { usePlanChannel } from '../plan/usePlan'
import type { Article, OfferStore } from './article'

/**
 * Opens one Article Agent and hands out the three things that ride its one
 * multiplexed socket: the Plan channel, an Offer store over `@callable` RPC, and
 * the client itself for `useAgentChat` — §8. A second socket would mean a second
 * Plan writer, which §3 rule 1 forbids.
 */

export type ArticleSocket = ReturnType<typeof useAgent<Plan>>

export type ArticleConnection = {
	article: Article
	agent: ArticleSocket
}

export function useArticleAgent(articleId: string): ArticleConnection {
	// `useAgent` hands back a new client on each reconnect, so both halves read
	// this rather than closing over one generation of it.
	const socket = useRef<ArticleSocket | null>(null)
	const channel = usePlanChannel(() => socket.current)

	const agent = useAgent<Plan>({
		agent: 'article-agent',
		name: articleId,
		onStateUpdate: channel.onStateUpdate,
		onMessage: channel.onMessage,
	})

	// Assigned in the render that made it, and not in an effect. React runs a
	// child's effects before its parent's, so an effect here would still be
	// holding null when the Panels below mount and the Offer ledger makes its
	// first read — which is every reader of this Article being told the Agent is
	// not connected, once, with nothing to make them ask again.
	socket.current = agent

	// `[]` keeps the store's identity: `useOfferLedger` reads its rows once per
	// store it is given.
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

/** An RPC on whichever socket is current. The client queues a call made before
 * the socket opens and sends it on connect, so only a caller that beat
 * `useArticleAgent`'s own render is refused here. */
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
