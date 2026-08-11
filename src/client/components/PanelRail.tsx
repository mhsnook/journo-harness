import { cx } from '../lib/cx'

export const PANELS = ['chat', 'plan', 'draft', 'notes'] as const
export type PanelId = (typeof PANELS)[number]

export interface PanelRailProps {
	/** Which Panels are on screen. Order is always chat → plan → draft → notes. */
	open: readonly PanelId[]
	/** Omit to render the rail as a static indicator. */
	onToggle?: (Panel: PanelId) => void
	className?: string
}

/**
 * The four-Panel toggle: chat · plan · draft · notes.
 *
 * Deliberately *not* accented. Which Panels are open is state, not a call to
 * action, so the active pill is solid ink and the accent stays free for the
 * one thing on screen that actually wants a decision.
 */
export function PanelRail({ open, onToggle, className }: PanelRailProps) {
	return (
		<div
			className={cx(
				'flex shrink-0 items-center gap-0.5 rounded-full border border-edge bg-sunk p-0.5',
				className,
			)}
			role={onToggle ? 'group' : undefined}
			aria-label={onToggle ? 'Visible Panels' : undefined}
		>
			{PANELS.map((Panel) => {
				const isOpen = open.includes(Panel)
				const Tag = (onToggle ? 'button' : 'span') as 'button'
				return (
					<Tag
						key={Panel}
						{...(onToggle
							? {
									type: 'button' as const,
									onClick: () => onToggle(Panel),
									'aria-pressed': isOpen,
								}
							: {})}
						className={cx(
							'rounded-full px-2.5 py-1 text-[0.6875rem] leading-none font-medium transition-colors',
							isOpen ? 'bg-ink text-paper' : 'text-faint',
							onToggle && !isOpen && 'hover:bg-hush hover:text-muted',
						)}
					>
						{Panel}
					</Tag>
				)
			})}
		</div>
	)
}
