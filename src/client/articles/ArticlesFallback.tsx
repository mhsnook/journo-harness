import type { ErrorComponentProps } from '@tanstack/react-router'
import { useRouter } from '@tanstack/react-router'

import { Button } from '../components/Button'
import { Screen } from '../components/Frame'
import { Loading } from '../components/Loading'
import { Notice } from '../components/Notice'
import { TitleBar } from '../components/TitleBar'
import { reasonFor } from '../lib/failure'

/** What the two Area routes show instead of a View: while the index is being
 * read, and when the read fails. */

/**
 * Only seen on a slow read — the router holds the previous screen for its
 * `pendingMs` first, so a local read swaps straight to the rows.
 */
export function ArticlesPending() {
	return (
		<Screen>
			<Loading>Opening your Articles…</Loading>
		</Screen>
	)
}

export function ArticlesFailed({ error, reset }: ErrorComponentProps) {
	const router = useRouter()

	const again = () => {
		reset()
		void router.invalidate()
	}

	return (
		<Screen>
			<TitleBar title="Articles" />
			<div className="flex flex-col items-start gap-3 p-4">
				<Notice>Your Articles didn't load. {reasonFor(error)}</Notice>
				<Button onClick={again} size="sm">
					try again
				</Button>
			</div>
		</Screen>
	)
}
