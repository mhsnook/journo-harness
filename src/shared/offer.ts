import { z } from 'zod'

import { sourceSchema } from './plan'

/**
 * An Offer: something the Chat turned up and handed to the writer to rule on.
 *
 * An Offer is a row in the Article Agent's SQLite, never a field of the Plan.
 * A row write touches named columns, so the Chat can add an Offer while the
 * writer edits the Plan and neither write erases the other
 * (docs/architecture.md §3, rule 2).
 *
 * Offers are flat: two Quotes from one publication are two Offers.
 */

/** What sort of thing an Offer holds. A Quote is a Reference that carries a
 * text, so today the Kind follows from the content — it is stored because the
 * Kinds that come later will not follow from anything. */
export const offerKinds = ['reference', 'quote'] as const
export type OfferKind = (typeof offerKinds)[number]

/** How far the writer has got with one Offer. Every Offer starts Undecided. */
export const dispositions = ['undecided', 'accepted', 'declined'] as const
export type Disposition = (typeof dispositions)[number]

/** What the writer may rule. Undecided is absent because it is not a ruling:
 * an Offer starts there, and a Declined one returns there through
 * `restoreOffer`, which is the undo of a Decline. */
export const rulings = ['accepted', 'declined'] as const
export type Ruling = (typeof rulings)[number]

/** What the Chat turned up. The id, the disposition, and the timestamps are
 * the Article Agent's to set, so they are not here. */
export const offerContentSchema = z
	.strictObject({
		kind: z.enum(offerKinds),
		text: z.string().min(1).optional(),
		source: sourceSchema.optional(),
		note: z.string().min(1).optional(),
	})
	.refine((offer) => offer.text !== undefined || offer.source !== undefined, {
		error: 'An Offer carries a text, a source, or both. One with neither is nothing.',
	})
	.refine((offer) => offer.kind !== 'quote' || offer.text !== undefined, {
		error:
			'A Quote is a Reference that carries a text, so an Offer of kind quote has one.',
	})

export type OfferContent = z.infer<typeof offerContentSchema>

/** One Offer row. `decidedAt` is null while the Offer is Undecided, and
 * returns to null when a Declined one is restored. */
export type Offer = OfferContent & {
	id: string
	disposition: Disposition
	createdAt: number
	decidedAt: number | null
}
