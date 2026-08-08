import type { ReactNode } from 'react'

import { cx } from '../lib/cx'

export interface NoticeProps {
	children: ReactNode
	className?: string
}

/**
 * One sentence saying a thing did not land: a refused edit, a write the Article
 * Agent rejected, a composer that will not send.
 *
 * Accented, which is the app's one way of asking for the writer's attention —
 * `foundations/Accent.mdx`. It is a component rather than a copied class string
 * so the several places that say it cannot drift apart on their padding.
 */
export function Notice({ children, className }: NoticeProps) {
	return (
		<p
			className={cx(
				'rounded-md border border-accent-edge bg-accent-soft p-2 text-[0.75rem] text-accent-ink',
				className,
			)}
		>
			{children}
		</p>
	)
}
