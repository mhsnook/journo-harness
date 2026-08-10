import type { CSSProperties, ReactNode, Ref, UIEventHandler } from 'react'

import { cx } from '../lib/cx'

export interface PanelProps {
	/** The scrolling element itself — the Chat holds it to keep the transcript
	 * at its foot. */
	ref?: Ref<HTMLElement>
	/** Said as the writer scrolls this Panel. */
	onScroll?: UIEventHandler<HTMLElement>
	/** `surface` is the writing surface; `sunk` is everything that supports it. */
	variant?: 'surface' | 'sunk'
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
 * One vertical Panel in the horizontal rail. Panels never stack — they slide in
 * and out beside each other, always in chat → plan → draft → notes order.
 *
 * **Each Panel scrolls its own Y.** Reading down the Plan does not move the Chat
 * beside it, which is what lets two Panels of different lengths sit side by
 * side. It needs a height to bite on: the Frame body gives it one, and a Panel
 * inside a body with no height simply grows as it always did.
 */
export function Panel({
	ref,
	onScroll,
	variant = 'surface',
	width,
	grow = 1,
	divider = 'none',
	padded = true,
	children,
	className,
	style,
}: PanelProps) {
	return (
		<section
			ref={ref}
			onScroll={onScroll}
			data-panel=""
			className={cx(
				'flex min-h-0 min-w-0 flex-col overflow-y-auto',
				variant === 'sunk' ? 'bg-sunk' : 'bg-surface',
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
