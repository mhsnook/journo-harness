import type { CSSProperties, ReactNode } from 'react'

import { cx } from '../lib/cx'

export interface PanelProps {
	/** `surface` is the writing surface; `sunk` is everything that supports it. */
	variant?: 'surface' | 'sunk'
	/** Fixed width in px, or a flex ratio when omitted. */
	width?: number | string
	grow?: number
	divider?: 'left' | 'right' | 'none'
	padded?: boolean
	/** Pinned to the bottom while the Panel scrolls past it — the Chat composer.
	 * The Panel gives up its own bottom padding to it, because that padding is
	 * inside the scrollport and content scrolls into it. */
	footer?: ReactNode
	children?: ReactNode
	className?: string
	style?: CSSProperties
}

/**
 * One vertical Panel in the horizontal rail. Panels never stack — they slide in
 * and out beside each other, always in chat → plan → draft → notes order.
 *
 * **Each Panel scrolls its own Y.** Reading down the Plan does not move the Chat
 * beside it, which is what lets two Panels of different lengths sit side by
 * side. It needs a height to bite on: the Frame body gives it one, and a Panel
 * inside a body with no height simply grows as it always did.
 *
 * A control that has to stay reachable while it scrolls goes in `footer`, which
 * owns the padding handoff a sticky element needs. Passing one as a child
 * instead leaves it to scroll away.
 */
export function Panel({
	variant = 'surface',
	width,
	grow = 1,
	divider = 'none',
	padded = true,
	footer,
	children,
	className,
	style,
}: PanelProps) {
	return (
		<section
			data-panel=""
			className={cx(
				'flex min-h-0 min-w-0 flex-col overflow-y-auto',
				variant === 'sunk' ? 'bg-sunk' : 'bg-surface',
				divider === 'left' && 'border-l border-edge',
				divider === 'right' && 'border-r border-edge',
				padded && (footer === undefined ? 'gap-3.5 p-3.5' : 'gap-3.5 p-3.5 pb-0'),
				className,
			)}
			style={{ width, flex: width ? '0 0 auto' : grow, ...style }}
		>
			{children}
			{footer === undefined ? null : (
				// `bg-inherit` carries the Panel's own background under it, and the
				// bottom padding is the Panel's, handed over above.
				<div
					className={cx('sticky bottom-0 z-10 mt-auto bg-inherit', padded && 'pb-3.5')}
				>
					{footer}
				</div>
			)}
		</section>
	)
}

export interface PanelHeaderProps {
	title: ReactNode
	meta?: ReactNode
	actions?: ReactNode
	className?: string
}

/** A Panel's own header row: name on the left, counts and controls after it. */
export function PanelHeader({ title, meta, actions, className }: PanelHeaderProps) {
	return (
		<div className={cx('flex items-baseline gap-2.5', className)}>
			<h3 className="text-[0.875rem] font-semibold text-ink">{title}</h3>
			{meta ? <span className="text-[0.75rem] text-faint">{meta}</span> : null}
			{actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
		</div>
	)
}
