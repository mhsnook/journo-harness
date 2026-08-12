import { Rail } from '../components/Rail'

export const OUTLINE_VIEWS = ['list', 'map'] as const
export type OutlineView = (typeof OUTLINE_VIEWS)[number]

export interface ViewRailProps {
	view: OutlineView
	onView: (view: OutlineView) => void
	className?: string
}

/** The switch between the Plan Panel's two Views of the Outline: the list of
 * Sections, and the map. */
export function ViewRail({ view, onView, className }: ViewRailProps) {
	return (
		<Rail
			className={className}
			items={OUTLINE_VIEWS}
			label="How the Outline is shown"
			on={[view]}
			onPick={onView}
		/>
	)
}
