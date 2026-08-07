import { z } from 'zod'

import { referenceKindSchema, sourceSchema } from './plan/schema'

/**
 * An Offer, as coined in context.md. Stored in the Article Agent's SQLite,
 * Offers are kept as a flat list of References and Quotes turned up from
 * research.
 */

/** How far the writer has got with one Offer. Every Offer starts Undecided. */
export const dispositions = ['undecided', 'accepted', 'declined'] as const
export type Disposition = (typeof dispositions)[number]

export const rulingSchema = z.enum(['accepted', 'declined'])
export type Ruling = z.infer<typeof rulingSchema>

/** What the Chat turned up. The id, the disposition, and the timestamps are
 * the Article Agent's to set, so they are not here. */
export const offerContentSchema = z
	.strictObject({
		kind: referenceKindSchema,
		text: z.string().min(1).optional(),
		source: sourceSchema.optional(),
		note: z.string().min(1).optional(),
	})
	.refine((offer) => offer.text !== undefined || offer.source !== undefined, {
		error: 'An Offer carries a text, a source, or both. One with neither is nothing.',
	})
	.refine((offer) => offer.kind !== 'quote' || offer.text !== undefined, {
		error: 'An Offer of Kind quote carries a text.',
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
