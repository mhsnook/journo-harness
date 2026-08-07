import type { Disposition, Offer } from './offer'
import type { OutlineEntry, Plan, Reference } from './plan'
import { outlineEntries } from './plan'

/**
 * The Offer ledger — docs/architecture.md §5. A View over an Article's Offers
 * and what the writer decided about each, derived on read and stored nowhere.
 *
 * The two halves come from two stores that nothing joins: the Offers are rows
 * in the Article Agent, and the References are fields in the Plan blob. What
 * bridges them is Provenance, and every question this module answers about "the
 * same thing on both sides" follows that pointer rather than comparing content
 * — the writer edits the Plan's copy, and content stops matching the moment
 * they do.
 */

/** One Section, and the References the writer placed at it. Sections with none
 * are here too: the Panel shows the empty slot. */
export type LedgerSection = OutlineEntry & { references: Reference[] }

export type OfferLedger = {
	/** Every Offer, in the order the Article Agent recorded them. */
	offers: Offer[]
	byDisposition: Record<Disposition, Offer[]>
	/** The filter counts, `all` included so the chips read from one place. */
	counts: Record<'all' | Disposition, number>
	/** Accepted Offers that did not make it to the Plan's References. */
	stranded: Offer[]
	/** The Plan half, in Outline order. */
	sections: LedgerSection[]
	/** References the writer has not placed at a Section yet. */
	unplaced: Reference[]
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

export type Acceptance = {
	plan: Plan
	reference: Reference
	/** True when the Plan came back untouched, already having a copy. */
	alreadyThere: boolean
}

/** The second of Accepting's two writes. The Offer is the one
 * `setOfferDisposition` returned. */
export function acceptIntoPlan(plan: Plan, offer: Offer, id: string): Acceptance {
	const held = referenceForOffer(plan, offer.id)
	if (held !== undefined) return { plan, reference: held, alreadyThere: true }

	const reference = referenceFromOffer(offer, id)

	return {
		plan: { ...plan, references: [...plan.references, reference] },
		reference,
		alreadyThere: false,
	}
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

	const placed = new Map<string, Reference[]>()
	const unplaced: Reference[] = []
	for (const reference of plan.references) {
		if (reference.nodeId === null) {
			unplaced.push(reference)
			continue
		}

		const held = placed.get(reference.nodeId)
		if (held === undefined) placed.set(reference.nodeId, [reference])
		else held.push(reference)
	}

	return {
		offers: [...offers],
		byDisposition,
		counts: {
			all: offers.length,
			undecided: byDisposition.undecided.length,
			accepted: byDisposition.accepted.length,
			declined: byDisposition.declined.length,
		},
		stranded: byDisposition.accepted.filter(
			(offer) => referenceForOffer(plan, offer.id) === undefined,
		),
		sections: outlineEntries(plan.outline).map((entry) => ({
			...entry,
			references: placed.get(entry.node.id) ?? [],
		})),
		unplaced,
	}
}
