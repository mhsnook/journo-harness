import type { Disposition, Offer } from './offer'
import type { Plan, Reference } from './plan'

/**
 * The Offer ledger — docs/architecture.md §5. What is here needs both stores at
 * once, joined on Provenance; the Plan half alone is `client/plan/references.ts`.
 */

export type OfferLedger = {
	/** In the order the Article Agent recorded them. */
	offers: readonly Offer[]
	byDisposition: Record<Disposition, Offer[]>
	/** `all` included, so the filter chips read from one place. */
	counts: Record<'all' | Disposition, number>
	/** Accepted Offers that did not make it to the Plan's References. */
	stranded: Offer[]
}

/** Found on Provenance, not on content: the writer edits their copy. */
export function referenceForOffer(plan: Plan, offerId: string): Reference | undefined {
	return plan.references.find((reference) => reference.provenance.offerId === offerId)
}

/** Copied rather than moved — §3, rule 5. */
export function referenceFromOffer(offer: Offer, id: string): Reference {
	// Absent rather than undefined — §4.
	const reference: Reference = {
		id,
		type: offer.type,
		provenance: { type: 'offer', offerId: offer.id },
		nodeId: null,
	}
	if (offer.text !== undefined) reference.text = offer.text
	if (offer.source !== undefined) reference.source = offer.source
	if (offer.note !== undefined) reference.note = offer.note

	return reference
}

/** Derived on read. Both halves arrive whole from their own store, so a third
 * copy would only need keeping in step. */
export function offerLedger(plan: Plan, offers: readonly Offer[]): OfferLedger {
	const byDisposition: Record<Disposition, Offer[]> = {
		undecided: [],
		accepted: [],
		declined: [],
	}
	for (const offer of offers) byDisposition[offer.disposition].push(offer)

	const copied = new Set(plan.references.map((reference) => reference.provenance.offerId))

	return {
		offers,
		byDisposition,
		counts: {
			all: offers.length,
			undecided: byDisposition.undecided.length,
			accepted: byDisposition.accepted.length,
			declined: byDisposition.declined.length,
		},
		stranded: byDisposition.accepted.filter((offer) => !copied.has(offer.id)),
	}
}
