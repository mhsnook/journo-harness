import { cx } from '../lib/cx'
import { PanelRail, type PanelId } from './PanelRail'

export interface ArticleBarProps {
	title: string
	/** Right-hand status: "draft 1", "round 2", "§3 of 4". */
	status?: string
	open: readonly PanelId[]
	onToggle?: (Panel: PanelId) => void
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
	title,
	status,
	open,
	onToggle,
	divided = true,
	className,
}: ArticleBarProps) {
	return (
		<header
			className={cx(
				'flex shrink-0 items-center gap-3 px-3 py-2',
				divided && 'border-b border-rule',
				className,
			)}
		>
			<span className="min-w-0 flex-1 truncate text-[0.8125rem] text-faint">{title}</span>
			<PanelRail open={open} onToggle={onToggle} />
			<span className="min-w-0 flex-1 truncate text-right text-[0.75rem] whitespace-nowrap text-faint">
				{status}
			</span>
		</header>
	)
}
