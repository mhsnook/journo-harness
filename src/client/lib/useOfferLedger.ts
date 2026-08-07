import { useEffect, useState } from 'react'

import { offerLedger, type OfferLedger } from '../../shared/ledger'
import type { Offer } from '../../shared/offer'
import { acceptOffer } from '../plan/edits'
import { useArticle } from './article'

/**
 * The Offer ledger, live. Rows are read once when the Panel opens, because
 * nothing tells a client a row changed; the Plan half is already reactive — §3.
 */

export type OfferLedgerHandle = {
	ledger: OfferLedger
	/** Until the first `listOffers` answers. */
	loading: boolean
	/** In one sentence, for the writer to read. */
	failure: string | null
	accept: (offer: Offer) => void
	decline: (offer: Offer) => void
	restore: (offer: Offer) => void
}

export function useOfferLedger(): OfferLedgerHandle {
	const { offers: store, edit } = useArticle()
	const [rows, setRows] = useState<Offer[] | null>(null)
	const [failure, setFailure] = useState<string | null>(null)

	useEffect(() => {
		let live = true

		store.listOffers().then(
			(listed) => {
				if (live) setRows(listed)
			},
			(error: unknown) => {
				if (live) setFailure(`The Offers did not load. ${reasonFor(error)}`)
			},
		)

		return () => {
			live = false
		}
	}, [store])

	/** In place: a ruling does not change the recorded order. */
	function replace(ruled: Offer) {
		setRows((held) =>
			(held ?? []).map((offer) => (offer.id === ruled.id ? ruled : offer)),
		)
	}

	function run(what: string, write: () => Promise<Offer>, then: (ruled: Offer) => void) {
		setFailure(null)
		write().then(then, (error: unknown) => setFailure(`${what} ${reasonFor(error)}`))
	}

	return {
		ledger: offerLedger(rows ?? []),
		loading: rows === null,
		failure,

		// Two writes against two stores, decoupled — §5. The Plan goes first and
		// lands locally, because the copy is built from what the Offer says and
		// needs nothing the ruling returns. A ruling that then fails leaves the
		// copy in place and the row Undecided, which the writer clears by
		// Accepting again: the second `acceptOffer` builds no op.
		accept(offer) {
			edit((held) => acceptOffer(held, offer))
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

function reasonFor(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}
