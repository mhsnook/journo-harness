import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { type ArticleStatus, untitledArticle } from '../../shared/article'
import { ArticlePanels } from '../article/ArticlePanels'
import { StatusPicker } from '../article/StatusPicker'
import { usePanels } from '../article/usePanels'
import { useTitleCopy } from '../article/useTitleCopy'
import { useArticleIndex } from '../articles/useArticles'
import { ArticleBar } from '../components/ArticleBar'
import { Button } from '../components/Button'
import { Notice } from '../components/Notice'
import { ArticleProvider, useArticle } from '../lib/article'
import { type ArticleSocket, useArticleAgent } from '../lib/useArticleAgent'

/**
 * One Article — architecture.md §8, issue #29.
 *
 * **The connection is opened here, above the Panels.** `useArticleAgent` makes
 * the single `useAgent` call and the Panels read it through `ArticleProvider`. A
 * Panel opening its own would be a second socket, a second `createPlanWriter`,
 * and a second debounce timer against a blob whose whole design is that it has
 * one writer (§3, rule 1).
 */
export const Route = createFileRoute('/a/$articleId')({ component: ArticleRoute })

function ArticleRoute() {
	const { articleId } = Route.useParams()
	const { article, agent } = useArticleAgent(articleId)

	// The window sits inside the provider so the bar and the Panels read one
	// connection rather than being handed pieces of it.
	return (
		<ArticleProvider value={article}>
			<ArticleWindow agent={agent} articleId={articleId} />
		</ArticleProvider>
	)
}

function ArticleWindow({
	agent,
	articleId,
}: {
	agent: ArticleSocket
	articleId: string
}) {
	const navigate = useNavigate()
	const { plan } = useArticle().plan
	const panels = usePanels()
	const index = useArticleIndex()
	const entry = index.articles.find((one) => one.id === articleId)

	const copyFailure = useTitleCopy(articleId, plan?.title ?? null)
	const failure = copyFailure ?? index.failure

	const articles = () => navigate({ to: '/' })

	const archive = () => {
		index.edit(articleId, { archived: true })
		articles()
	}

	const setStatus = (status: ArticleStatus) => index.edit(articleId, { status })

	// The Plan holds the real title, and the index row stands in until the socket
	// answers. Both are empty on a brand new Article.
	const title = plan?.title ?? entry?.title ?? ''

	return (
		<div className="flex h-dvh flex-col bg-surface text-ink">
			<ArticleBar
				back="Articles"
				onBack={articles}
				onToggle={panels.toggle}
				open={panels.open}
				stacked={panels.narrow}
				status={
					entry === undefined ? null : (
						<>
							<StatusPicker onStatus={setStatus} status={entry.status} />
							<Button onClick={archive} size="sm" variant="quiet">
								archive
							</Button>
						</>
					)
				}
				title={title.trim() === '' ? untitledArticle : title}
			/>
			{failure === null ? null : (
				<div className="shrink-0 px-3 pt-2">
					<Notice>{failure}</Notice>
				</div>
			)}
			<ArticlePanels agent={agent} open={panels.open} />
		</div>
	)
}
