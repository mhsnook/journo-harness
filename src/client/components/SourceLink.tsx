import type { ReactNode } from 'react'

import { cx } from '../lib/cx'

export interface SourceLinkProps {
	/** The url the Reference carries. */
	url: string
	/** What to print instead of the url — the source title, usually. */
	children?: ReactNode
	className?: string
}

/** A Reference's url, as something the writer can click. It opens in a new tab
 * — §8. */
export function SourceLink({ url, children, className }: SourceLinkProps) {
	return (
		<a
			className={cx(
				'underline decoration-edge underline-offset-[3px] hover:text-ink hover:decoration-ink/40',
				className,
			)}
			href={url}
			rel="noreferrer"
			target="_blank"
		>
			{children ?? url}
		</a>
	)
}
