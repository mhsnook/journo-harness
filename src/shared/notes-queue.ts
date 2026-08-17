import type { Note, NoteDisposition } from './note'

/**
 * The Notes queue — the View the Notes Panel reads. A query over Notes, not a
 * store of its own, the way the Offer ledger is a query over Offers (§5).
 *
 * One queue holds every Round's Notes rather than only the last Review's. A
 * Note the writer accepted three Rounds ago is still owed, and a Review that
 * produced nothing new should not clear the list.
 */

/** Which Notes the writer is looking at. */
export type QueueView = {
	/** Narrows to what the writer has taken on. */
	acceptedOnly: boolean
	/** A resolved Note is finished, so it is out of the way until asked for. */
	showResolved: boolean
}

export const wholeQueue: QueueView = { acceptedOnly: false, showResolved: false }

export type NotesQueue = {
	/** What to draw, in the order the Guide wrote them. */
	visible: readonly Note[]
	byDisposition: Record<NoteDisposition, Note[]>
	/** `all` included, so the filter chips read from one place. */
	counts: Record<'all' | NoteDisposition, number>
	/** Accepted and not yet resolved — what the writer still owes the piece. */
	open: number
}

/**
 * What a Review is bound by: the Notes the writer has taken on and not yet
 * resolved. A dismissed Note is the writer saying no, so re-offering it is the
 * one thing a later Review should not do, and a resolved one is finished.
 */
export function openNotes(notes: readonly Note[]): Note[] {
	return notes.filter((note) => note.disposition === 'accepted')
}

/** Derived on read. The rows arrive whole from their store, so a second copy
 * would only need keeping in step. */
export function notesQueue(
	notes: readonly Note[],
	view: QueueView = wholeQueue,
): NotesQueue {
	const byDisposition: Record<NoteDisposition, Note[]> = {
		proposed: [],
		accepted: [],
		dismissed: [],
		resolved: [],
	}
	for (const note of notes) byDisposition[note.disposition].push(note)

	return {
		visible: notes.filter((note) => shows(note.disposition, view)),
		byDisposition,
		counts: {
			all: notes.length,
			proposed: byDisposition.proposed.length,
			accepted: byDisposition.accepted.length,
			dismissed: byDisposition.dismissed.length,
			resolved: byDisposition.resolved.length,
		},
		open: byDisposition.accepted.length,
	}
}

/** Mock 8(c), stated once: a resolved Note waits to be asked for, and a
 * dismissed one stays on the queue struck through, because undoing it is the
 * only way back. */
function shows(disposition: NoteDisposition, view: QueueView): boolean {
	if (disposition === 'resolved') return view.showResolved
	if (view.acceptedOnly) return disposition === 'accepted'

	return true
}
