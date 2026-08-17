import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { type ArticleStatus, displayTitle } from '../../shared/article'
import { ArticlePanels } from '../article/ArticlePanels'
import { StatusPicker } from '../article/StatusPicker'
import { useSeedTitle, useTitleCopy } from '../article/title'
import { usePanels } from '../article/usePanels'
import { articlesQuery, useArticleEntry, useEditArticle } from '../articles/useArticles'
import { useNewTitle } from '../articles/useNewArticle'
import { ArticleBar } from '../components/ArticleBar'
import { Button } from '../components/Button'
import { Screen } from '../components/Frame'
import { Notice } from '../components/Notice'
import type { PanelId } from '../components/PanelRail'
import { Skeleton } from '../components/Skeleton'
import { BackLink } from '../components/TitleBar'
import { ArticleProvider, useArticle } from '../lib/article'
import {
	type ArticleSocket,
	useArticleAgent,
	wakeArticleAgent,
} from '../lib/useArticleAgent'
import { NotesProvider, useNotesScreen } from '../notes/NotesContext'
import { ReviewView } from '../notes/ReviewView'

/** The connection is opened above the Panels: a Panel opening its own would be a
 * second writer against a blob designed for one (architecture.md §3 rule 1). */
export const Route = createFileRoute('/a/$articleId')({
	component: ArticleRoute,
	// Nothing is awaited, so hovering starts both and clicking waits for neither.
	// The index carries this Article's title and status, and on a deep link it is
	// the only source for either until the socket answers.
	loader: ({ context, params }) => {
		wakeArticleAgent(params.articleId)
		void context.queryClient.ensureQueryData(articlesQuery)
	},
})

function ArticleRoute() {
	const { articleId } = Route.useParams()
	const { article, agent } = useArticleAgent(articleId)

	return (
		<ArticleProvider value={article}>
			{/* Keyed, so moving to another Article starts its hooks clean rather
			    than carrying the last one's debounced title into them. */}
			<NotesProvider key={articleId}>
				<ArticleWindow agent={agent} articleId={articleId} />
			</NotesProvider>
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
	const index = useEditArticle()
	const entry = useArticleEntry(articleId)

	useSeedTitle(connection, useNewTitle())
	const copyFailure = useTitleCopy(articleId, plan?.title ?? null)
	const failure = copyFailure ?? index.failure

	const archive = () => {
		index.edit(articleId, { archived: true })
		void navigate({ to: '/' })
	}

	const setStatus = (status: ArticleStatus) => index.edit(articleId, { status })

	// The index row stands in until the socket answers with the real one, and
	// `null` until neither has. `''` cannot say that: it is also the title the
	// writer cleared, which the bar draws as "Untitled article".
	const title = plan?.title ?? entry?.title ?? null

	return (
		<Screen>
			<ArticleBar
				back={<BackLink to="/">Articles</BackLink>}
				onToggle={panels.toggle}
				open={panels.open}
				stacked={panels.narrow}
				status={
					entry === undefined ? (
						<Skeleton className="w-24" label="Opening the Article" />
					) : (
						<>
							<StatusPicker onStatus={setStatus} status={entry.status} />
							<Button onClick={archive} size="sm" variant="quiet">
								archive
							</Button>
						</>
					)
				}
				title={title === null ? null : displayTitle(title)}
			/>
			{failure === null ? null : (
				<div className="shrink-0 px-3 pt-2">
					<Notice>{failure}</Notice>
				</div>
			)}
			<ArticleBody agent={agent} open={panels.open} />
		</Screen>
	)
}

/**
 * The Panel row, or one Review read whole.
 *
 * A Review takes the window rather than a column: the writer asked for it, and
 * it is prose to read rather than material to work beside. Everything else on
 * the screen stays — the bar, the title, the Panel rail — so going back is one
 * control and not a navigation.
 */
function ArticleBody({ agent, open }: { agent: ArticleSocket; open: PanelId[] }) {
	const screen = useNotesScreen()
	const round = screen.reading

	if (round === null) return <ArticlePanels agent={agent} open={open} />

	return (
		<ReviewView
			naming={screen.naming}
			notes={screen.notes}
			onAccept={screen.accept}
			onBack={screen.close}
			onDecline={screen.decline}
			onOpenRound={screen.read}
			onResolve={screen.resolve}
			onRestore={screen.restore}
			onSaveSkill={(name) => screen.skills.save({ name, prompt: round.prompt })}
			round={round}
			rounds={screen.rounds}
		/>
	)
}
