import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { ArticlesFailed, ArticlesPending } from '../articles/ArticlesFallback'
import { BoardView } from '../articles/BoardView'
import { articlesQuery, useArticleIndex } from '../articles/useArticles'
import { useNewArticle } from '../articles/useNewArticle'
import { Screen } from '../components/Frame'
import { useOpenArticle } from '../lib/openArticle'

/** The Board View: the same unarchived Articles the list shows, by status. */
export const Route = createFileRoute('/board')({
	component: BoardRoute,
	// Four bare columns are a claim about the work, so the rows come first.
	loader: ({ context }) => context.queryClient.ensureQueryData(articlesQuery),
	pendingComponent: ArticlesPending,
	errorComponent: ArticlesFailed,
})

function BoardRoute() {
	const navigate = useNavigate()
	const open = useOpenArticle()
	const index = useArticleIndex()
	const starting = useNewArticle((article, title) => open(article.id, title))

	return (
		<Screen>
			<BoardView
				articles={index.articles}
				failure={index.failure}
				onBack={() => navigate({ to: '/' })}
				onNew={starting.start}
				onOpen={open}
			/>
			{starting.dialog}
		</Screen>
	)
}
