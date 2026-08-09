import { createFileRoute } from '@tanstack/react-router'

import { BoardView } from '../articles/BoardView'
import { useArticleIndex } from '../articles/useArticles'
import { useStartArticle } from '../articles/useNewArticle'

/** The Board View: the same unarchived Articles the list shows, by status. */
export const Route = createFileRoute('/_area/board')({ component: BoardRoute })

function BoardRoute() {
	const index = useArticleIndex()

	return (
		<BoardView
			articles={index.articles}
			failure={index.failure}
			onNew={useStartArticle()}
		/>
	)
}
