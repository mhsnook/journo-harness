import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { BoardView } from '../articles/BoardView'
import { useArticleIndex } from '../articles/useArticles'

/** The Board View: the same unarchived Articles the list shows, by status. */
export const Route = createFileRoute('/board')({ component: BoardRoute })

function BoardRoute() {
	const navigate = useNavigate()
	const index = useArticleIndex()

	const open = (articleId: string) =>
		navigate({ to: '/a/$articleId', params: { articleId } })

	return (
		<div className="flex h-dvh flex-col bg-surface text-ink">
			<BoardView
				articles={index.articles}
				failure={index.failure}
				loading={index.loading}
				onBack={() => navigate({ to: '/' })}
				onNew={() => index.create(open)}
				onOpen={open}
			/>
		</div>
	)
}
