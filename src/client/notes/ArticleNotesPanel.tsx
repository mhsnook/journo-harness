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
			onAccept={screen.accept}
			onDecline={screen.decline}
			onRead={screen.read}
			onResolve={screen.resolve}
			onRestore={screen.restore}
			onRun={screen.runReview}
			onView={screen.setView}
			queue={screen.queue}
			rounds={screen.rounds}
			running={screen.running}
			skills={screen.skills.skills}
			view={screen.view}
		/>
	)
}
