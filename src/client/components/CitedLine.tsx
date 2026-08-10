import type { ReactNode } from 'react'

import { cx } from '../lib/cx'

export interface CitedLineProps {
	/** What the record carries, widest first, with whatever the heading above
	 * already said left out. An empty list draws nothing. */
	parts: ReactNode[]
	className?: string
}

/**
 * The small line under a Reference's heading: author, publication, year, url.
 *
 * The separator lives here and nowhere else. Which parts go in is the caller's,
 * because a Chat card and a Plan row are headed by different things and so have
 * different things left to say.
 */
export function CitedLine({ parts, className }: CitedLineProps) {
	if (parts.length === 0) return null

	return (
		<p
			className={cx(
				'flex flex-wrap items-center gap-x-1.5 text-[0.6875rem] text-faint',
				className,
			)}
		>
			{parts.map((part, index) => (
				// Positional: these are the fields of one record in a fixed order, and
				// nothing reorders them within a render.
				<span className="min-w-0" key={index}>
					{index > 0 ? <span aria-hidden>· </span> : null}
					{part}
				</span>
			))}
		</p>
	)
}
