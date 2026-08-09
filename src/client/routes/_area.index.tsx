import { createFileRoute } from '@tanstack/react-router'

import { ArticleList } from '../articles/ArticleList'
import { useArticleIndex } from '../articles/useArticles'
import { useStartArticle } from '../articles/useNewArticle'

/** The Articles Area, as a list. `/board` is the same rows by status. */
export const Route = createFileRoute('/_area/')({ component: ArticlesRoute })

function ArticlesRoute() {
	const index = useArticleIndex()

	return (
		<ArticleList
			articles={index.articles}
			failure={index.failure}
			onNew={useStartArticle()}
			onRestore={(id) => index.edit(id, { archived: false })}
		/>
	)
}
