import type { Disposition, Offer } from './offer'
import type { Plan, Reference } from './plan'

/**
 * The Offer ledger — docs/architecture.md §5. A View over an Article's Offers
 * and what the writer decided about each, derived on read and stored nowhere.
 *
 * What is here is what needs both stores at once: the Offers are rows in the
 * Article Agent and the References are fields in the Plan blob, and Provenance
 * is the only thing that joins them. Reading the Plan half alone is
 * `src/client/plan/references.ts`.
 *
 * Every question about "the same thing on both sides" follows the Provenance
 * rather than comparing content — the writer edits their copy, and content
 * stops matching the moment they do.
 */

export type OfferLedger = {
	/** Every Offer, in the order the Article Agent recorded them. */
	offers: readonly Offer[]
	byDisposition: Record<Disposition, Offer[]>
	/** The filter counts, `all` included so the chips read from one place. */
	counts: Record<'all' | Disposition, number>
	/** Accepted Offers that did not make it to the Plan's References. */
	stranded: Offer[]
}

/** The Plan's copy of one Offer, found on its Provenance. */
export function referenceForOffer(plan: Plan, offerId: string): Reference | undefined {
	return plan.references.find((reference) => reference.provenance.offerId === offerId)
}

/** Creates a Reference from an Offer, with Provenance — §3, rule 5. */
export function referenceFromOffer(offer: Offer, id: string): Reference {
	// Each optional field is set only when the Offer carries it. A key holding
	// undefined would be a second spelling of "nothing here" — §4.
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

/** Read the Ledger. Nothing here writes, and nothing is cached: both halves
 * arrive whole from their own store, so re-deriving is cheaper than keeping a
 * third copy in step with them. */
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
