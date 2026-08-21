import { z } from 'zod'

import { idSchema } from './plan/schema'

/** A Note — `context.md` for the word, `docs/reviews.md` for what one is for. */

export const noteDispositions = ['proposed', 'accepted', 'declined', 'resolved'] as const
export type NoteDisposition = (typeof noteDispositions)[number]

/** What the writer may rule directly. The enum omits `resolved`, which is
 * reached by resolving an accepted Note instead. */
export const noteRulingSchema = z.enum(['accepted', 'declined'])
export type NoteRuling = z.infer<typeof noteRulingSchema>

/**
 * Where a Note points. A Block anchor is a run rather than one id, because
 * `docs/adr/0003` anchors at paragraph range: the target is the span from the
 * first Block to the last.
 *
 * **A Block id here means a Block**, a direct child of the document. `UniqueID`
 * also mints ids for paragraphs nested in a list item, so anything asking "is
 * this Note still anchored?" reads the document's own children — issue #54.
 */
export const noteAnchorSchema = z.discriminatedUnion('kind', [
	z.strictObject({ kind: z.literal('article') }),
	z.strictObject({ kind: z.literal('section'), nodeId: idSchema }),
	z.strictObject({ kind: z.literal('blocks'), blockIds: z.array(idSchema).min(1) }),
])
export type NoteAnchor = z.infer<typeof noteAnchorSchema>

export const wholePiece: NoteAnchor = { kind: 'article' }

/** What the Guide writes, against the row fields the Article Agent adds.
 * `type` is a free string because `context.md` calls the list illustrative; the
 * suggested set is in the model's own instructions. */
export const noteContentSchema = z.strictObject({
	type: z.string().min(1),
	anchor: noteAnchorSchema,
	label: z.string().min(1).optional(),
	body: z.string().min(1),
})
export type NoteContent = z.infer<typeof noteContentSchema>

/** One Note row. `decidedAt` is null while the Note is proposed, and returns to
 * null when a ruled one is restored. */
export type Note = NoteContent & {
	id: string
	roundId: string
	disposition: NoteDisposition
	createdAt: number
	decidedAt: number | null
}

/**
 * The anchor as it will be stored, given what the Article and the Draft carry.
 * `blockIds` is the Draft in reading order, since a run is settled by position.
 *
 * Runs once, when the Note is written. A run is stored as every Block in its
 * span rather than the ends the model named, so a Block deleted later drops
 * out and the rest still hold — ¶3–¶5 loses ¶5 and reads as ¶3–¶4. What
 * happens to an anchor afterwards is `docs/reviews.md`.
 */
export function settleAnchor(
	anchor: NoteAnchor,
	known: { nodeIds: ReadonlySet<string>; blockIds: readonly string[] },
): NoteAnchor {
	if (anchor.kind === 'article') return anchor

	if (anchor.kind === 'section') {
		return known.nodeIds.has(anchor.nodeId) ? anchor : wholePiece
	}

	const at = new Map(known.blockIds.map((id, index) => [id, index]))
	const indices = anchor.blockIds
		.map((id) => at.get(id))
		.filter((index): index is number => index !== undefined)

	if (indices.length === 0) return wholePiece

	const first = Math.min(...indices)
	const last = Math.max(...indices)

	return { kind: 'blocks', blockIds: known.blockIds.slice(first, last + 1) }
}

/** Shared, so the Agent and any in-memory store word these the same. */
export function missingNote(id: string): Error {
	return new Error(`No Note carries the id ${id}.`)
}

export function alreadyRuled(note: Note): Error {
	return new Error(
		`Note ${note.id} is ${note.disposition}, and only a proposed Note is ruled.`,
	)
}

export function notAccepted(note: Note): Error {
	return new Error(
		`Note ${note.id} is ${note.disposition}, and resolving finishes an accepted Note.`,
	)
}

/** Where restoring puts a Note back. Each settled disposition has exactly one
 * place it came from, so undoing needs no history. */
export function restoredTo(disposition: NoteDisposition): NoteDisposition | null {
	if (disposition === 'accepted' || disposition === 'declined') return 'proposed'
	if (disposition === 'resolved') return 'accepted'

	return null
}

export function notRestorable(note: Note): Error {
	return new Error(
		`Note ${note.id} is ${note.disposition}, and only a ruled Note is restored.`,
	)
}
