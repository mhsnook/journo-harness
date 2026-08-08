import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { ArticleList } from '../articles/ArticleList'
import { useArticleIndex } from '../articles/useArticles'
import { useNewArticle } from '../articles/useNewArticle'

/** The Articles Area, as a list. `/board` is the same rows by status. */
export const Route = createFileRoute('/')({ component: ArticlesRoute })

function ArticlesRoute() {
	const navigate = useNavigate()
	const index = useArticleIndex()
	const starting = useNewArticle()

	const open = (articleId: string) =>
		navigate({ to: '/a/$articleId', params: { articleId } })

	return (
		<div className="flex h-dvh flex-col bg-surface text-ink">
			<ArticleList
				articles={index.articles}
				failure={index.failure}
				loading={index.loading}
				onBoard={() => navigate({ to: '/board' })}
				onNew={starting.start}
				onOpen={open}
				onRestore={(id) => index.edit(id, { archived: false })}
			/>
			{starting.dialog}
		</div>
	)
}
