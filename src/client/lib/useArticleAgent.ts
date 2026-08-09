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

/**
 * Builds the Article Agent without connecting to it. A plain GET on the Agent's
 * route wakes the Durable Object and runs its `onStart`, so the socket the
 * Article screen opens a moment later finds it already up. The answer is thrown
 * away, and a failure here only means the screen waits as it would have.
 */
export function wakeArticleAgent(articleId: string): void {
	// Same path routeAgentRequest maps onto the binding — see server/index.ts.
	void fetch(`/agents/article-agent/${encodeURIComponent(articleId)}`).catch(() => {})
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

	// In render, not an effect: React runs a child's effects first, so the Panels
	// below would make their first RPC against a null socket.
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

/** An RPC on whichever socket is current. The client queues one made before the
 * socket opens, so only a caller ahead of the render above is refused. */
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
