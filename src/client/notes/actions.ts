import type { Note } from '../../shared/note'

/** The four ways the writer moves one Note, passed as one object because every
 * surface that draws a Note passes all four through. */
export type NoteActions = {
	accept: (note: Note) => void
	decline: (note: Note) => void
	resolve: (note: Note) => void
	restore: (note: Note) => void
}
