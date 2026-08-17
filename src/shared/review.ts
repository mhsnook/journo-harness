import { z } from 'zod'

import { type Note, noteContentSchema } from './note'
import { planSchema } from './plan'

/**
 * A Review and the Round it produces — context.md and `docs/architecture.md`
 * §3. A Review is an intentional pass over the Article: one prompt, one
 * response, and no memory of the last one. Rounds accumulate so the writer can
 * see what a Review said before the last set of changes.
 *
 * **A Round is a written response, not a list.** It alternates prose the writer
 * reads with tranches of Notes anchored to the piece, so the reasoning stays
 * beside the Notes it produced. The Notes Panel shows the same rows flattened
 * into a queue, and accepting in either place is one write.
 */

/**
 * How hard the Review works. The writer's own prompt still does the finer
 * steering; this is the coarse dial in front of it, like the effort setting on
 * a coding harness.
 */
export const reviewDepths = ['quick', 'thorough'] as const
export type ReviewDepth = (typeof reviewDepths)[number]

/**
 * What the writer asks for.
 *
 * The Plan rides here for the same reason it rides in a Chat turn's `body`
 * (§6): the client applies a Proposal and may hold a newer Plan than the
 * Article Agent has stored, and the Review should be about the one on screen.
 * Absent is ordinary, and state is then the only Plan there is.
 */
export const reviewRequestSchema = z.strictObject({
	prompt: z.string().min(1),
	depth: z.enum(reviewDepths),
	plan: planSchema.optional(),
})
export type ReviewRequest = z.infer<typeof reviewRequestSchema>

/**
 * One part of the response: a passage of prose, and the Notes it produced.
 *
 * Flat rather than a union of "some prose" and "some notes". A model fills one
 * object shape more reliably than it alternates between two, and the rendering
 * is the same either way — the prose, then the tranche under it. A part that
 * makes no Note carries an empty list, which is ordinary: not every paragraph
 * of a review lands on a specific line.
 *
 * `label` heads the tranche — "on the first point". The count beside it is
 * derived, so the model never states a number it could get wrong.
 */
export const reviewPartSchema = z.strictObject({
	prose: z.string().min(1),
	label: z.string().min(1).optional(),
	notes: z.array(noteContentSchema),
})
export type ReviewPart = z.infer<typeof reviewPartSchema>

/** What the model answers with, whole. */
export const reviewOutputSchema = z.strictObject({
	parts: z.array(reviewPartSchema).min(1),
})
export type ReviewOutput = z.infer<typeof reviewOutputSchema>

/**
 * How a Round is stored, once its Notes are rows.
 *
 * The Notes are ids rather than contents, so the response and the queue read
 * the same rows and a ruling made on one surface is already made on the other.
 */
export type RoundPart = {
	prose: string
	label?: string
	noteIds: string[]
}

/**
 * Where a Round has got to.
 *
 * `running` is a state and not an absence, because the Article Agent runs the
 * Review rather than the client (§3, rule 4 and issue #11). The writer can
 * start a thorough Review, close the tab, and come back to the findings — so
 * "a Review is in flight" has to be a row that survives them leaving, and a
 * Review that fails with nobody connected has to leave a reason behind.
 */
export const roundStates = ['running', 'done', 'failed'] as const
export type RoundState = (typeof roundStates)[number]

/** One numbered Review of an Article. */
export type Round = {
	id: string
	/** What the writer reads: "Round 3". Counts every Round on this Article,
	 * failed ones included, because a Round they watched fail is one they saw. */
	ordinal: number
	state: RoundState
	/** What the writer asked for, kept so the response can echo it. */
	prompt: string
	depth: ReviewDepth
	/** Empty while the Review runs, and empty on one that failed. */
	parts: RoundPart[]
	/** Why it failed, and null otherwise. */
	failure: string | null
	startedAt: number
	/** Null while it runs. */
	finishedAt: number | null
}

/** A Round and the Notes it wrote, in the order the response puts them. */
export type ReviewResponse = {
	round: Round
	notes: readonly Note[]
}

/**
 * One Review at a time per Article.
 *
 * Two run at once whenever the writer double-clicks or has the Article open
 * twice, and `await` inside a Durable Object lets a second call interleave with
 * the first — issue #9. The guard is the running Round row rather than a field,
 * because in-memory state does not survive hibernation.
 */
export function reviewAlreadyRunning(round: Round): Error {
	return new Error(`Round ${round.ordinal} is still running on this Article.`)
}

export function missingRound(id: string): Error {
	return new Error(`No Round carries the id ${id}.`)
}

/**
 * What the Article Agent broadcasts when a Review settles.
 *
 * Rows have no sync (§3), so nothing would otherwise tell a waiting client that
 * the Round it started has finished. This frame says which one, and the client
 * reads the rows back over RPC — the same shape as `plan_refused`, which is the
 * other thing on this socket that has to reach a client unasked.
 */
export type ReviewFinished = {
	type: 'review_finished'
	roundId: string
}

/** Pick it out of everything else on the multiplexed socket. */
export function isReviewFinished(frame: unknown): frame is ReviewFinished {
	return (
		typeof frame === 'object' &&
		frame !== null &&
		(frame as { type?: unknown }).type === 'review_finished'
	)
}
