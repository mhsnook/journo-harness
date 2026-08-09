import type { ReactNode } from 'react'

import { cx } from '../lib/cx'
import { PanelRail, type PanelId } from './PanelRail'
import { BackButton } from './TitleBar'

export interface ArticleBarProps {
	/** Where it goes back to, named. Nothing renders without one. */
	back?: string
	onBack?: () => void
	title: string
	/** Right-hand status: "draft 1", "round 2", "§3 of 4", or the controls that
	 * set one. */
	status?: ReactNode
	open: readonly PanelId[]
	onToggle?: (Panel: PanelId) => void
	/** Put the rail on a row of its own — beside the title and the status there
	 * is nowhere near the width for four pills. */
	stacked?: boolean
	/** Draw the rule underneath. Off when the Panel below carries its own edge. */
	divided?: boolean
	className?: string
}

/**
 * The article window's own bar — quieter than {@link TitleBar} because it sits
 * above a writing surface. Title and status recede; the Panel rail is the only
 * thing with any weight.
 */
export function ArticleBar({
	back,
	onBack,
	title,
	status,
	open,
	onToggle,
	stacked = false,
	divided = true,
	className,
}: ArticleBarProps) {
	const rail = <PanelRail onToggle={onToggle} open={open} />

	return (
		<header
			className={cx(
				'flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2',
				divided && 'border-b border-rule',
				className,
			)}
		>
			<BackButton back={back} onBack={onBack} />
			<span className="min-w-0 flex-1 truncate text-[0.8125rem] text-faint">{title}</span>
			{stacked ? null : rail}
			<span className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right text-[0.75rem] whitespace-nowrap text-faint">
				{status}
			</span>
			{stacked ? (
				<PanelRail className="w-full justify-center" onToggle={onToggle} open={open} />
			) : null}
		</header>
	)
}
