import { Rail } from './Rail'

export const PANELS = ['chat', 'plan', 'draft', 'notes'] as const
export type PanelId = (typeof PANELS)[number]

export interface PanelRailProps {
	/** Which Panels are on screen. Order is always chat → plan → draft → notes. */
	open: readonly PanelId[]
	/** Omit to render the rail as a static indicator. */
	onToggle?: (Panel: PanelId) => void
	className?: string
}

/** The four-Panel toggle: chat · plan · draft · notes. */
export function PanelRail({ open, onToggle, className }: PanelRailProps) {
	return (
		<Rail
			className={className}
			items={PANELS}
			label="Visible Panels"
			on={open}
			onPick={onToggle}
		/>
	)
}
