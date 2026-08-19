import { useState } from 'react'

import type { PanelProps } from '../components/Panel'
import { NotesPanel } from './NotesPanel'
import { ReviewPanel } from './ReviewPanel'
import { useSkills } from './skills'
import { useNotes } from './useNotes'

/** Drives the Notes Panel from the Article Agent, the same split as
 * `ArticlePlanPanel` and `ArticleDraftPanel`. */

export interface ArticleNotesPanelProps {
	divider?: PanelProps['divider']
	/** This Panel's share of the Panel row — `panelShare`. */
	grow?: PanelProps['grow']
	className?: string
}

export function ArticleNotesPanel({ divider, grow, className }: ArticleNotesPanelProps) {
	const notes = useNotes()
	const skills = useSkills()

	// The id rather than the Round, because the rows reload whenever a Review
	// settles.
	const [readingId, setReadingId] = useState<string | null>(null)
	const reading = notes.rounds.find((round) => round.id === readingId) ?? null

	const frame = { className, divider, grow }

	if (reading !== null) {
		return (
			<ReviewPanel
				{...frame}
				naming={notes.naming}
				notes={notes.notes}
				onBack={() => setReadingId(null)}
				onOpenRound={(round) => setReadingId(round.id)}
				onSaveSkill={(name) => skills.save({ name, prompt: reading.prompt })}
				round={reading}
				rounds={notes.rounds}
				actions={notes.actions}
			/>
		)
	}

	return (
		<NotesPanel
			{...frame}
			actions={notes.actions}
			failure={notes.failure}
			loading={notes.loading}
			naming={notes.naming}
			onRead={(round) => setReadingId(round.id)}
			onRun={notes.runReview}
			onView={notes.setView}
			queue={notes.queue}
			rounds={notes.rounds}
			skills={skills.skills}
			view={notes.view}
		/>
	)
}
