import { createContext, type ReactNode, useContext, useState } from 'react'

import type { Round } from '../../shared/review'
import { type SkillsHandle, useSkills } from './skills'
import { type NotesHandle, useNotes } from './useNotes'

/**
 * The Notes Panel and the written response are two readings of one set of rows,
 * so they share one hook rather than each opening their own. The response also
 * takes the window rather than sitting in the Panel row, which means the
 * Article screen has to know it is open — that is what `reading` is.
 *
 * It sits under `ArticleProvider`, because `useNotes` reads the Article Agent
 * the same way every other Panel does.
 */

export type NotesScreen = NotesHandle & {
	skills: SkillsHandle
	/** The Round being read whole, and null while the Panels are on screen. */
	reading: Round | null
	read: (round: Round) => void
	close: () => void
}

const NotesContext = createContext<NotesScreen | null>(null)

export function NotesProvider({
	children,
	opensOn = null,
}: {
	children: ReactNode
	/** The Round to open on, for a showcase screen that is about one. The app
	 * opens on the Panels and reaches a Review through the Notes Panel. */
	opensOn?: string | null
}) {
	const notes = useNotes()
	const skills = useSkills()
	// The id rather than the Round: the rows reload whenever a Review settles,
	// and a held object would keep drawing the Round as it was before it did.
	const [readingId, setReadingId] = useState<string | null>(opensOn)

	const reading = notes.rounds.find((round) => round.id === readingId) ?? null

	return (
		<NotesContext.Provider
			value={{
				...notes,
				skills,
				reading,
				read: (round) => setReadingId(round.id),
				close: () => setReadingId(null),
			}}
		>
			{children}
		</NotesContext.Provider>
	)
}

export function useNotesScreen(): NotesScreen {
	const screen = useContext(NotesContext)
	if (screen === null) {
		throw new Error('The Notes Panel needs a NotesProvider above it.')
	}

	return screen
}
