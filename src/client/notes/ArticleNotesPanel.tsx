import type { PanelProps } from '../components/Panel'
import { useNotesScreen } from './NotesContext'
import { NotesPanel } from './NotesPanel'

/** Drives `NotesPanel` from the rows the `NotesProvider` holds. */

export interface ArticleNotesPanelProps {
	divider?: PanelProps['divider']
	/** This Panel's share of the Panel row — `panelShare`. */
	grow?: PanelProps['grow']
	className?: string
}

export function ArticleNotesPanel({ divider, grow, className }: ArticleNotesPanelProps) {
	const screen = useNotesScreen()

	return (
		<NotesPanel
			className={className}
			divider={divider}
			failure={screen.failure}
			grow={grow}
			loading={screen.loading}
			naming={screen.naming}
			onRead={screen.read}
			onRun={screen.runReview}
			onView={screen.setView}
			queue={screen.queue}
			rounds={screen.rounds}
			rulings={screen.rulings}
			skills={screen.skills.skills}
			view={screen.view}
		/>
	)
}
