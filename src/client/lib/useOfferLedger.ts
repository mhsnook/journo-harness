import { useEffect, useState } from 'react'

import { acceptIntoPlan, offerLedger, type OfferLedger } from '../../shared/ledger'
import type { Offer } from '../../shared/offer'
import { useArticle } from './article'

/**
 * The Offer ledger, live. It reads the Offers once when the Panel opens, which
 * is what the row store is for — `@callable` RPC is request and response, so
 * nothing tells a client a row changed (§3). The Plan half arrives reactively
 * through Article Agent state, so the View is re-derived on every render.
 */

export type OfferLedgerHandle = {
	ledger: OfferLedger
	/** True until the first `listOffers` answers. */
	loading: boolean
	/** The last write that did not land, in one sentence for the writer. */
	failure: string | null
	accept: (offer: Offer) => void
	decline: (offer: Offer) => void
	restore: (offer: Offer) => void
	/** The second half of Accepting, on its own — the re-add for a stranded
	 * Offer, whose row is Accepted and whose copy never reached the Plan. */
	addToPlan: (offer: Offer) => void
}

export function useOfferLedger(): OfferLedgerHandle {
	const { offers: store, plan, setPlan } = useArticle()
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

	/** Replace one row in place: the Ledger's order is the order the Article
	 * Agent recorded them, and a ruling does not change it. */
	function replace(ruled: Offer) {
		setRows((held) =>
			(held ?? []).map((offer) => (offer.id === ruled.id ? ruled : offer)),
		)
	}

	// `acceptIntoPlan` hands back the Plan it was given where a copy is already
	// there, so a second Accept returns the same object and React re-renders
	// nothing. The id is drawn out here to keep the update pure.
	function copyIntoPlan(offer: Offer) {
		const id = crypto.randomUUID()
		setPlan((held) => acceptIntoPlan(held, offer, id).plan)
	}

	function run(what: string, write: () => Promise<Offer>, then: (ruled: Offer) => void) {
		setFailure(null)
		write().then(then, (error: unknown) => setFailure(`${what} ${reasonFor(error)}`))
	}

	return {
		ledger: offerLedger(plan, rows ?? []),
		loading: rows === null,
		failure,

		// Accepting requires two writes against two stores, decoupled. The row
		// goes first, because it carries the Provenance the copy needs. The
		// Ledger shows the Offer stranded if the second write never lands.
		accept(offer) {
			run(
				'This Offer was not Accepted.',
				() => store.setOfferDisposition(offer.id, 'accepted'),
				(ruled) => {
					replace(ruled)
					copyIntoPlan(ruled)
				},
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

		addToPlan(offer) {
			setFailure(null)
			copyIntoPlan(offer)
		},
	}
}

function reasonFor(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}
