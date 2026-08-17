import { z } from 'zod'

import { idSchema } from './plan/schema'

/**
 * A Note — context.md. One observation from the Guide: a type, an anchor, and a
 * body of one or two sentences. A SQLite row in the Article Agent, written by
 * the Guide and ruled on by the writer — `docs/architecture.md` §3, rules 2 and
 * 4.
 *
 * A Note is what survives a Review. The writer reads the Round's prose, and the
 * Note captures one point from it and says where in the piece it lands, so the
 * body can stay short: the writer remembers the argument around it.
 */

/**
 * How far the writer has got with one Note.
 *
 * Two moves, not four states in a line. `proposed` is what the Guide wrote;
 * `accepted` and `declined` are the writer's ruling on it; `resolved` is an
 * accepted Note they have since dealt with. Restoring undoes the last move,
 * which is why each settled disposition has exactly one place to go back to.
 *
 * **The verb is `decline`, the same word an Offer and a Proposal take.** The
 * writer rules on all three the same way, so one verb covers the act — one word
 * per meaning, product-wide. `proposed` differs from an Offer's `undecided`
 * because it says where the record came from rather than what the writer did:
 * the Guide proposed it, and research turned an Offer up.
 */
export const noteDispositions = ['proposed', 'accepted', 'declined', 'resolved'] as const
export type NoteDisposition = (typeof noteDispositions)[number]

/** What the writer may rule directly. `resolved` is not here: it is reached by
 * resolving an accepted Note, never by ruling a proposed one. */
export const noteRulingSchema = z.enum(['accepted', 'declined'])
export type NoteRuling = z.infer<typeof noteRulingSchema>

/**
 * Where a Note points.
 *
 * Three kinds, and the writer reads all three the same way — "whole piece",
 * "§2", "¶3–¶5". A Block anchor is a run rather than one id, because
 * `docs/adr/0003` anchors at paragraph range: the target is the span from the
 * first Block to the last, so a paragraph written in the middle belongs to it.
 *
 * **A Block id here means a Block**, which is a direct child of the document.
 * `UniqueID` also mints ids for paragraphs nested inside a list item, so
 * anything asking "is this Note still anchored?" reads the document's own
 * children rather than every element carrying an id — issue #54.
 */
export const noteAnchorSchema = z.discriminatedUnion('kind', [
	z.strictObject({ kind: z.literal('article') }),
	z.strictObject({ kind: z.literal('section'), nodeId: idSchema }),
	z.strictObject({ kind: z.literal('blocks'), blockIds: z.array(idSchema).min(1) }),
])
export type NoteAnchor = z.infer<typeof noteAnchorSchema>

/** The whole piece, which is what an anchor naming nothing falls back to. */
export const wholePiece: NoteAnchor = { kind: 'article' }

/**
 * What the Guide writes, against the row fields the Article Agent adds.
 *
 * `type` is a free string rather than an enum: `context.md` calls the list —
 * structure, tone drift, citations, repetition, budget, pacing, plan divergence
 * — illustrative rather than a fixed taxonomy, and the Panel groups by whatever
 * comes back. The suggested set is in the model's own instructions, where a new
 * one costs a prompt edit instead of a migration.
 *
 * `label` is the two or three words the card shows beside the anchor — "keep",
 * "re-argued", "third statement". It is not a title: the body is the note.
 */
export const noteContentSchema = z.strictObject({
	type: z.string().min(1),
	anchor: noteAnchorSchema,
	label: z.string().min(1).optional(),
	body: z.string().min(1),
})
export type NoteContent = z.infer<typeof noteContentSchema>

/** One Note row. `decidedAt` is null while the Note is proposed, and returns to
 * null when a declined one is restored. */
export type Note = NoteContent & {
	id: string
	/** The Round that wrote it. */
	roundId: string
	disposition: NoteDisposition
	createdAt: number
	decidedAt: number | null
}

/**
 * The anchor as it will be stored, given what the Article and the Draft
 * actually carry.
 *
 * The model names ids it read in the pack, and it can still name one that is
 * gone or one that never existed. Neither breaks the client — an anchor it
 * cannot resolve simply reads as the whole piece — so this takes the write and
 * settles the anchor rather than refusing the Note, which is issue #42's line
 * applied to a record where nothing is load-bearing.
 *
 * It runs once, when the Note is written. A Block that dies **later** leaves
 * the anchor as it is and the Note reads as orphaned, because the writer may
 * undo the deletion and the anchor should still mean what it meant.
 */
export function settleAnchor(
	anchor: NoteAnchor,
	known: { nodeIds: ReadonlySet<string>; blockIds: ReadonlySet<string> },
): NoteAnchor {
	if (anchor.kind === 'article') return anchor

	if (anchor.kind === 'section') {
		return known.nodeIds.has(anchor.nodeId) ? anchor : wholePiece
	}

	// A run keeps whichever ends are real: naming ¶3 and a paragraph that is not
	// there is still a note about ¶3.
	const blockIds = anchor.blockIds.filter((id) => known.blockIds.has(id))

	return blockIds.length === 0 ? wholePiece : { kind: 'blocks', blockIds }
}

/** Shared, so the Agent and any in-memory store word these the same. */
export function missingNote(id: string): Error {
	return new Error(`No Note carries the id ${id}.`)
}

/** Ruling a Note that has already been ruled on. */
export function alreadyRuled(note: Note): Error {
	return new Error(
		`Note ${note.id} is ${note.disposition}, and only a proposed Note is ruled.`,
	)
}

/** Resolving is what the writer does to an accepted Note once they have dealt
 * with it, so there is nothing to resolve anywhere else. */
export function notAccepted(note: Note): Error {
	return new Error(
		`Note ${note.id} is ${note.disposition}, and resolving finishes an accepted Note.`,
	)
}

/**
 * Where restoring puts a Note back.
 *
 * Each settled disposition has exactly one place it came from, so undoing needs
 * no history: an accepted or declined Note was proposed, and a resolved one
 * was accepted. Null means there is nothing to undo, which is only true of a
 * Note nobody has ruled on.
 */
export function restoredTo(disposition: NoteDisposition): NoteDisposition | null {
	if (disposition === 'accepted' || disposition === 'declined') return 'proposed'
	if (disposition === 'resolved') return 'accepted'

	return null
}

/** Restoring undoes the last move, and a Note that has not moved has none. */
export function notRestorable(note: Note): Error {
	return new Error(
		`Note ${note.id} is ${note.disposition}, and only a ruled Note is restored.`,
	)
}
