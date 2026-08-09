import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { type ArticleStatus, displayTitle } from '../../shared/article'
import { ArticlePanels } from '../article/ArticlePanels'
import { StatusPicker } from '../article/StatusPicker'
import { useSeedTitle, useTitleCopy } from '../article/title'
import { usePanels } from '../article/usePanels'
import { useArticleEntry, useArticleIndex } from '../articles/useArticles'
import { useNewTitle } from '../articles/useNewArticle'
import { ArticleBar } from '../components/ArticleBar'
import { Button } from '../components/Button'
import { Screen } from '../components/Frame'
import { Notice } from '../components/Notice'
import { ArticleProvider, useArticle } from '../lib/article'
import { type ArticleSocket, useArticleAgent } from '../lib/useArticleAgent'

/**
 * One Article. **The connection is opened here, above the Panels**, which read it
 * through `ArticleProvider` — a Panel opening its own would be a second writer
 * against a blob designed for one (architecture.md §8, and §3 rule 1).
 */
export const Route = createFileRoute('/a/$articleId')({ component: ArticleRoute })

function ArticleRoute() {
	const { articleId } = Route.useParams()
	const { article, agent } = useArticleAgent(articleId)

	return (
		<ArticleProvider value={article}>
			{/* Keyed, so moving to another Article starts its hooks clean rather
			    than carrying the last one's debounced title into them. */}
			<ArticleWindow agent={agent} articleId={articleId} key={articleId} />
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
	const connection = useArticle().plan
	const { plan } = connection
	const panels = usePanels()
	const index = useArticleIndex()
	const entry = useArticleEntry(articleId)

	useSeedTitle(connection, useNewTitle())
	const copyFailure = useTitleCopy(articleId, plan?.title ?? null)
	const failure = copyFailure ?? index.failure

	const articles = () => navigate({ to: '/' })

	const archive = () => {
		index.edit(articleId, { archived: true })
		articles()
	}

	const setStatus = (status: ArticleStatus) => index.edit(articleId, { status })

	// The index row stands in until the socket answers with the real one.
	const title = plan?.title ?? entry?.title ?? ''

	return (
		<Screen>
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
				title={displayTitle(title)}
			/>
			{failure === null ? null : (
				<div className="shrink-0 px-3 pt-2">
					<Notice>{failure}</Notice>
				</div>
			)}
			<ArticlePanels agent={agent} open={panels.open} />
		</Screen>
	)
}
