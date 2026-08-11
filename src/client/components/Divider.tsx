import { cx } from '../lib/cx'

export interface DividerProps {
	/** `hair` separates rows; `strong` separates the big blocks of a screen. */
	weight?: 'hair' | 'strong'
	className?: string
}

export function Divider({ weight = 'hair', className }: DividerProps) {
	return (
		<hr
			className={cx(
				'border-0',
				weight === 'strong' ? 'h-px bg-edge' : 'h-px bg-rule',
				className,
			)}
		/>
	)
}

export interface GroupHeadingProps {
	children: React.ReactNode
	/** "24", "9 · 3 used" — sits after the label, always quiet. */
	count?: React.ReactNode
	/** Controls for the group, after the rule rather than before it, so the
	 * label and its count stay together on the left. */
	actions?: React.ReactNode
	className?: string
}

/**
 * A run-on heading: label, count, then a hairline eating the remaining width.
 * Used for every list in the Articles Area and in the Plan.
 */
export function GroupHeading({ children, count, actions, className }: GroupHeadingProps) {
	return (
		<div className={cx('flex items-center gap-2.5', className)}>
			<span className="label-meta shrink-0">
				{children}
				{count !== undefined ? <span> · {count}</span> : null}
			</span>
			<span className="h-px min-w-4 flex-1 bg-rule" />
			{actions === undefined ? null : <div className="shrink-0">{actions}</div>}
		</div>
	)
}
