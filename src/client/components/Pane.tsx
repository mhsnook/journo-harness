import type { CSSProperties, ReactNode } from 'react'

import { cx } from '../lib/cx'

export interface PaneProps {
	/** `surface` is the writing surface; `sunk` is everything that supports it. */
	tone?: 'surface' | 'sunk'
	/** Fixed width in px, or a flex ratio when omitted. */
	width?: number | string
	grow?: number
	divider?: 'left' | 'right' | 'none'
	padded?: boolean
	children?: ReactNode
	className?: string
	style?: CSSProperties
}

/**
 * One vertical pane in the horizontal rail. Panes never stack — they slide in
 * and out beside each other, always in chat → plan → draft → notes order.
 */
export function Pane({
	tone = 'surface',
	width,
	grow = 1,
	divider = 'none',
	padded = true,
	children,
	className,
	style,
}: PaneProps) {
	return (
		<section
			className={cx(
				'flex min-w-0 flex-col',
				tone === 'sunk' ? 'bg-sunk' : 'bg-surface',
				divider === 'left' && 'border-l border-edge',
				divider === 'right' && 'border-r border-edge',
				padded && 'gap-3.5 p-3.5',
				className,
			)}
			style={{ width, flex: width ? '0 0 auto' : grow, ...style }}
		>
			{children}
		</section>
	)
}

export interface PaneHeaderProps {
	title: ReactNode
	meta?: ReactNode
	actions?: ReactNode
	className?: string
}

/** A pane's own header row: name on the left, counts and controls after it. */
export function PaneHeader({ title, meta, actions, className }: PaneHeaderProps) {
	return (
		<div className={cx('flex items-baseline gap-2.5', className)}>
			<h3 className="text-[0.875rem] font-semibold text-ink">{title}</h3>
			{meta ? <span className="text-[0.75rem] text-faint">{meta}</span> : null}
			{actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
		</div>
	)
}
