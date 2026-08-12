import { useCallback, useEffect, useState } from 'react'

import { offerLedger, type OfferLedger } from '../../shared/ledger'
import type { Offer } from '../../shared/offer'
import { acceptOffer } from '../plan/edits'
import { refusalText } from '../plan/refusalText'
import { useArticle } from './article'
import { failureText } from './failure'

/**
 * The Offer ledger, live. Rows come down once per store, since nothing announces
 * a row changing — §3. A research turn writes rows behind the client's back, so
 * the Chat calls `reload` when a turn records some.
 */

export type OfferLedgerHandle = {
	ledger: OfferLedger
	/** Until the first `listOffers` answers. */
	loading: boolean
	failure: string | null
	accept: (offer: Offer) => void
	decline: (offer: Offer) => void
	restore: (offer: Offer) => void
	/** For after a turn records rows this client did not ask for. */
	reload: () => void
}

export function useOfferLedger(): OfferLedgerHandle {
	const { offers: store, plan: connection } = useArticle()
	const { edit, plan } = connection
	const [rows, setRows] = useState<Offer[] | null>(null)
	const [failure, setFailure] = useState<string | null>(null)
	const [reads, setReads] = useState(0)

	const reload = useCallback(() => setReads((count) => count + 1), [])

	useEffect(() => {
		let live = true

		store.listOffers().then(
			(listed) => {
				if (live) setRows(listed)
			},
			(error: unknown) => {
				if (live) setFailure(failureText('The Offers did not load.', error))
			},
		)

		return () => {
			live = false
		}
	}, [store, reads])

	/** In place: a ruling does not change the recorded order. */
	function replace(ruled: Offer) {
		setRows((held) =>
			(held ?? []).map((offer) => (offer.id === ruled.id ? ruled : offer)),
		)
	}

	function run(what: string, write: () => Promise<Offer>, then: (ruled: Offer) => void) {
		setFailure(null)
		write().then(then, (error: unknown) => setFailure(failureText(what, error)))
	}

	return {
		ledger: offerLedger(rows ?? []),
		loading: rows === null,
		failure,
		reload,

		// Two writes against two stores, decoupled — §5, which says why this
		// order and not the other. The Plan goes first because the copy is built
		// from what the Offer says and needs nothing the ruling returns, and a
		// refused copy stops the ruling rather than sending it anyway.
		accept(offer) {
			setFailure(null)

			const refusal = edit((held) => acceptOffer(held, offer))
			if (refusal !== null) {
				const why = plan === null ? refusal.message : refusalText(plan, refusal)
				setFailure(`This Offer was not Accepted. ${why}`)

				return
			}

			run(
				'This Offer was not Accepted.',
				() => store.setOfferDisposition(offer.id, 'accepted'),
				replace,
			)
		},

		decline(offer) {
			run(
				'This Offer was not Declined.',
				() => store.setOfferDisposition(offer.id, 'declined'),
				replace,
			)
		},

		restore(offer) {
			run('This Offer was not restored.', () => store.restoreOffer(offer.id), replace)
		},
	}
}
