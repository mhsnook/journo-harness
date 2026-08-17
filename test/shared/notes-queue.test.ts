import { describe, expect, it } from 'vitest'

import type { Note, NoteDisposition } from '../../src/shared/note'
import { restoredTo } from '../../src/shared/note'
import { notesQueue, openNotes, wholeQueue } from '../../src/shared/notes-queue'

/** One Note row, with the fields a test does not care about filled in. */
function makeNote(id: string, disposition: NoteDisposition): Note {
	return {
		id,
		roundId: 'round-1',
		type: 'repetition',
		anchor: { kind: 'article' },
		body: `Note ${id}`,
		disposition,
		createdAt: 0,
		decidedAt: disposition === 'proposed' ? null : 1,
	}
}

const notes = [
	makeNote('a', 'proposed'),
	makeNote('b', 'accepted'),
	makeNote('c', 'declined'),
	makeNote('d', 'resolved'),
	makeNote('e', 'accepted'),
]

describe('the Notes queue', () => {
	it('counts every disposition, and the whole list', () => {
		const queue = notesQueue(notes)

		expect(queue.counts).toEqual({
			all: 5,
			proposed: 1,
			accepted: 2,
			declined: 1,
			resolved: 1,
		})
	})

	it('hides a resolved Note until it is asked for', () => {
		expect(notesQueue(notes).visible.map((note) => note.id)).toEqual(['a', 'b', 'c', 'e'])

		expect(
			notesQueue(notes, { ...wholeQueue, showResolved: true }).visible.map(
				(note) => note.id,
			),
		).toEqual(['a', 'b', 'c', 'd', 'e'])
	})

	it('keeps a declined Note on the queue, because undoing it is the way back', () => {
		expect(notesQueue(notes).visible.map((note) => note.disposition)).toContain(
			'declined',
		)
	})

	it('narrows to what the writer has taken on', () => {
		const queue = notesQueue(notes, { ...wholeQueue, acceptedOnly: true })

		expect(queue.visible.map((note) => note.id)).toEqual(['b', 'e'])
	})

	it('keeps the order the Guide wrote them in', () => {
		const shuffled = [notes[4], notes[0], notes[1]]

		expect(notesQueue(shuffled).visible.map((note) => note.id)).toEqual(['e', 'a', 'b'])
	})

	it('counts an accepted Note as still owed, and a resolved one as finished', () => {
		expect(notesQueue(notes).open).toBe(2)
	})
})

describe('what a Review is bound by', () => {
	it('carries the accepted Notes and nothing else', () => {
		expect(openNotes(notes).map((note) => note.id)).toEqual(['b', 'e'])
	})

	it('leaves a declined Note out, so a later Review cannot re-argue it', () => {
		expect(openNotes(notes).map((note) => note.disposition)).not.toContain('declined')
	})
})

describe('restoring a Note', () => {
	it('puts a ruled Note back where it came from', () => {
		expect(restoredTo('accepted')).toBe('proposed')
		expect(restoredTo('declined')).toBe('proposed')
		expect(restoredTo('resolved')).toBe('accepted')
	})

	it('has nowhere to put a Note nobody has ruled on', () => {
		expect(restoredTo('proposed')).toBeNull()
	})
})
