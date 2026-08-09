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

		// Two writes against two stores, decoupled — §5. The Plan goes first and
		// lands locally, because the copy is built from what the Offer says and
		// needs nothing the ruling returns. A ruling that then fails leaves the
		// copy in place and the row Undecided, which the writer clears by
		// Accepting again: the second `acceptOffer` builds no op.
		//
		// **A refused copy stops the ruling.** Sending it anyway would leave the
		// row reading Accepted with the Plan holding nothing — invisible on the
		// Ledger and unfixable from it, which is the stranded case §5 is built to
		// avoid. The applier's refusal is what the writer is told about instead.
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
