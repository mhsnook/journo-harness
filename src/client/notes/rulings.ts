import type { Note } from '../../shared/note'

/**
 * The four ways a writer moves one Note.
 *
 * One type rather than four props, because every surface that draws a Note
 * passes all four straight through — the queue, the written response, each
 * tranche inside it, and the card itself. Threaded separately they were a
 * six-file edit to add a fifth, and two `Pick`/`Omit` restatements existed only
 * to re-derive the set.
 */
export type NoteRulings = {
	accept: (note: Note) => void
	decline: (note: Note) => void
	resolve: (note: Note) => void
	restore: (note: Note) => void
}
