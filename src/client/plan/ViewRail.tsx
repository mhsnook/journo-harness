import { cx } from '../lib/cx'

/**
 * The switch between the Plan Panel's two Views of the Outline: the list of
 * Sections, and the map.
 *
 * Built like the Panel rail in the bar above it, and for the same reason:
 * which View you are in is state rather than a decision the screen wants from
 * you, so the one you are in is solid ink and neither is accented —
 * `foundations/Accent.mdx`.
 */

export const OUTLINE_VIEWS = ['list', 'map'] as const
export type OutlineView = (typeof OUTLINE_VIEWS)[number]

export interface ViewRailProps {
	view: OutlineView
	onView: (view: OutlineView) => void
	className?: string
}

export function ViewRail({ view, onView, className }: ViewRailProps) {
	return (
		<div
			aria-label="How the Outline is shown"
			className={cx(
				'flex shrink-0 items-center gap-0.5 rounded-full border border-edge bg-sunk p-0.5',
				className,
			)}
			role="group"
		>
			{OUTLINE_VIEWS.map((one) => (
				<button
					key={one}
					aria-pressed={one === view}
					className={cx(
						'rounded-full px-2.5 py-1 text-[0.6875rem] leading-none font-medium transition-colors',
						one === view
							? 'bg-ink text-paper'
							: 'text-faint hover:bg-hush hover:text-muted',
					)}
					onClick={() => onView(one)}
					type="button"
				>
					{one}
				</button>
			))}
		</div>
	)
}
