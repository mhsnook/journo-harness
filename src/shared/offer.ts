import { z } from 'zod'

import { type ReferenceContent, referenceContentSchema } from './plan/schema'

/**
 * An Offer — context.md. A flat SQLite row carrying Reference content and the
 * row fields, so Accepting copies content onto content.
 */

/** How far the writer has got with one Offer. Every Offer starts Undecided. */
export const dispositions = ['undecided', 'accepted', 'declined'] as const
export type Disposition = (typeof dispositions)[number]

export const rulingSchema = z.enum(['accepted', 'declined'])
export type Ruling = z.infer<typeof rulingSchema>

/** One research turn's findings, in the order to show them. */
export const offerBatchSchema = z.array(referenceContentSchema).min(1)

/** One Offer row. `decidedAt` is null while the Offer is Undecided, and
 * returns to null when a Declined one is restored. */
export type Offer = ReferenceContent & {
	id: string
	disposition: Disposition
	createdAt: number
	decidedAt: number | null
}

/** Shared, so the Agent and the in-memory store word these the same. */
export function missingOffer(id: string): Error {
	return new Error(`No Offer carries the id ${id}.`)
}

/** Restoring undoes a Decline — context.md. */
export function notDeclined(offer: Offer): Error {
	return new Error(
		`Offer ${offer.id} is ${offer.disposition}, and restoring undoes a Decline.`,
	)
}

/**
 * What makes two Offers the same thing turned up twice, so a re-offer lands on
 * the row the writer already ruled on. The note is out because the Guide writes
 * it fresh each session; the text is in because two Quotes from one url are two
 * Offers.
 */
export function offerFingerprint(content: ReferenceContent): string {
	const source = content.source ?? {}

	// JSON, so no delimiter can turn up inside a field and shift the parts.
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
