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
	/**
	 * `all` included, so the filter chips read from one place.
	 *
	 * `accepted` is also what the writer still owes the piece: resolving moves a
	 * Note to its own disposition, so the accepted count already means "accepted
	 * and not yet resolved" and nothing needs to say that twice.
	 */
	counts: Record<'all' | NoteDisposition, number>
}

/** Derived on read. The rows arrive whole from their store, so a second copy
 * would only need keeping in step. */
export function notesQueue(
	notes: readonly Note[],
	view: QueueView = wholeQueue,
): NotesQueue {
	const counts: Record<'all' | NoteDisposition, number> = {
		all: notes.length,
		proposed: 0,
		accepted: 0,
		declined: 0,
		resolved: 0,
	}
	for (const note of notes) counts[note.disposition] += 1

	return { visible: notes.filter((note) => shows(note.disposition, view)), counts }
}

/** Mock 8(c), stated once: a resolved Note waits to be asked for, and a
 * declined one stays on the queue struck through, because undoing it is the
 * only way back. */
function shows(disposition: NoteDisposition, view: QueueView): boolean {
	if (disposition === 'resolved') return view.showResolved
	if (view.acceptedOnly) return disposition === 'accepted'

	return true
}
