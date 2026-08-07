import { z } from 'zod'

import { type ReferenceContent, referenceContentSchema } from './plan/schema'

/**
 * An Offer, as coined in context.md. Stored in the Article Agent's SQLite,
 * Offers are kept as a flat list of Links and Quotes turned up from research.
 *
 * An Offer carries **Reference content** and nothing of its own beyond the row
 * fields, so Accepting one copies content onto content — the two cannot drift
 * into disagreeing about what a Reference says.
 */

/** How far the writer has got with one Offer. Every Offer starts Undecided. */
export const dispositions = ['undecided', 'accepted', 'declined'] as const
export type Disposition = (typeof dispositions)[number]

export const rulingSchema = z.enum(['accepted', 'declined'])
export type Ruling = z.infer<typeof rulingSchema>

/** What the research tool hands the Article Agent — one turn's findings, in the
 * order the model wants them shown. */
export const offerBatchSchema = z.array(referenceContentSchema).min(1)

/** One Offer row. `decidedAt` is null while the Offer is Undecided, and
 * returns to null when a Declined one is restored. */
export type Offer = ReferenceContent & {
	id: string
	disposition: Disposition
	createdAt: number
	decidedAt: number | null
}

/** Refusals the writer may meet either way they reach an Offer. The wording
 * lives with the rule so the Article Agent and the in-memory store cannot say
 * one thing two ways. */
export function missingOffer(id: string): Error {
	return new Error(`No Offer carries the id ${id}.`)
}

/** Restoring undoes a Decline, so an Offer in any other disposition refuses. */
export function notDeclined(offer: Offer): Error {
	return new Error(
		`Offer ${offer.id} is ${offer.disposition}, and restoring undoes a Decline.`,
	)
}

/**
 * What makes two Offers the same thing turned up twice, so that research
 * repeating itself next session lands on the row the writer already ruled on
 * rather than on a second one.
 *
 * The note is left out: the Guide writes it fresh each session and it says
 * nothing about which source this is. The text is in, because Offers are flat —
 * two Quotes from one publication are two Offers, and a url on its own would
 * fold them into one.
 */
export function offerFingerprint(content: ReferenceContent): string {
	const source = content.source ?? {}

	// A JSON array rather than a joined string: any delimiter that can appear
	// inside a field lets two Offers that differ fingerprint the same.
	return JSON.stringify(
		[
			content.type,
			content.text,
			source.url,
			source.title,
			source.author,
			source.publication,
			source.year,
		].map((field) =>
			String(field ?? '')
				.trim()
				.toLowerCase(),
		),
	)
}
