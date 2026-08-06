import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cx } from '../lib/cx'

export type ChipTone = 'default' | 'accent' | 'outline' | 'muted' | 'solid'

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLElement>, 'children'> {
	tone?: ChipTone
	/** Renders as a button. Off by default — most chips are labels. */
	interactive?: boolean
	/** Dims the chip without changing its tone (unresolved, cut, not-yet). */
	dimmed?: boolean
	children?: ReactNode
}

const toneClass: Record<ChipTone, string> = {
	default: 'border-edge bg-hush text-muted',
	accent: 'border-accent-edge bg-accent text-accent-ink',
	outline: 'border-edge bg-transparent text-muted',
	muted: 'border-transparent bg-transparent text-faint',
	// `solid` is "you are here" — a tab or filter that is currently selected.
	// State, not a call to action, so it takes ink rather than the accent.
	solid: 'border-ink bg-ink text-paper',
}

/**
 * A small metadata token: word targets, adjectives, voices, statuses, filters.
 * Chips are read-only labels unless `interactive` is set.
 */
export function Chip({
	tone = 'default',
	interactive = false,
	dimmed = false,
	className,
	children,
	...rest
}: ChipProps) {
	const Tag = (interactive ? 'button' : 'span') as 'button'
	return (
		<Tag
			{...(interactive ? { type: 'button' as const } : {})}
			className={cx(
				'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-[0.1875rem] text-[0.6875rem] leading-none font-medium whitespace-nowrap',
				toneClass[tone],
				dimmed && 'opacity-45',
				interactive && 'transition-colors hover:border-ink/30 hover:text-ink',
				className,
			)}
			{...rest}
		>
			{children}
		</Tag>
	)
}
