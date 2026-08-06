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

export interface SectionHeadingProps {
	children: React.ReactNode
	/** "24", "9 · 3 used" — sits after the label, always quiet. */
	count?: React.ReactNode
	action?: React.ReactNode
	className?: string
}

/**
 * A run-on heading: label, count, a hairline that eats the remaining width,
 * then an optional link. Used for every list on the desk and in the plan.
 */
export function SectionHeading({
	children,
	count,
	action,
	className,
}: SectionHeadingProps) {
	return (
		<div className={cx('flex items-center gap-2.5', className)}>
			<span className="label-meta shrink-0">
				{children}
				{count !== undefined ? <span> · {count}</span> : null}
			</span>
			<span className="h-px min-w-4 flex-1 bg-rule" />
			{action}
		</div>
	)
}
