import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { ArticleList } from '../articles/ArticleList'
import { ArticlesFailed, ArticlesPending } from '../articles/ArticlesFallback'
import { articlesQuery, useArticleIndex } from '../articles/useArticles'
import { useNewArticle } from '../articles/useNewArticle'
import { Screen } from '../components/Frame'
import { useOpenArticle } from '../lib/openArticle'

/** The Articles Area, as a list. `/board` is the same rows by status. */
export const Route = createFileRoute('/')({
	component: ArticlesRoute,
	loader: ({ context }) => context.queryClient.ensureQueryData(articlesQuery),
	pendingComponent: ArticlesPending,
	errorComponent: ArticlesFailed,
})

function ArticlesRoute() {
	const navigate = useNavigate()
	const open = useOpenArticle()
	const index = useArticleIndex()
	const starting = useNewArticle((article, title) => open(article.id, title))

	return (
		<Screen>
			<ArticleList
				articles={index.articles}
				failure={index.failure}
				onBoard={() => navigate({ to: '/board' })}
				onNew={starting.start}
				onRestore={(id) => index.edit(id, { archived: false })}
			/>
			{starting.dialog}
		</Screen>
	)
}
