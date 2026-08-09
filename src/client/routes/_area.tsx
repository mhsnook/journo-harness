import { Outlet, createFileRoute } from '@tanstack/react-router'

import { ArticlesFailed, ArticlesPending } from '../articles/ArticlesFallback'
import { articlesQuery } from '../articles/useArticles'
import { StartArticleProvider, useNewArticle } from '../articles/useNewArticle'
import { Screen } from '../components/Frame'
import { useOpenArticle } from '../lib/openArticle'

/**
 * The Articles Area — the list at `/` and the Board at `/board`. Pathless, so
 * the two Views are one screen the router swaps the body of rather than two
 * screens that unmount each other: switching Views keeps the list's scroll
 * position, and keeps the new-Article dialog open if it is.
 *
 * The read and its two fallbacks live here for the same reason. Both Views want
 * the same rows, and a loader on each would be one rule written twice.
 */
export const Route = createFileRoute('/_area')({
	component: AreaRoute,
	loader: ({ context }) => context.queryClient.ensureQueryData(articlesQuery),
	pendingComponent: ArticlesPending,
	errorComponent: ArticlesFailed,
})

function AreaRoute() {
	const open = useOpenArticle()
	const starting = useNewArticle((article, title) => open(article.id, title))

	return (
		<Screen>
			<StartArticleProvider value={starting.start}>
				<Outlet />
			</StartArticleProvider>
			{starting.dialog}
		</Screen>
	)
}
