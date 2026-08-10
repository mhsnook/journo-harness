import type { ReactNode } from 'react'

import { cx } from '../lib/cx'

export interface SourceLinkProps {
	url: string
	/** The source title, usually. Falls back to printing the url. */
	children?: ReactNode
	className?: string
}

/** Renders a Reference's url as a link, opening in a new tab. */
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
