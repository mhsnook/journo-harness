import type { ReactNode } from 'react'

import type { ArticleEntry } from '../../shared/article'
import { articleTitle, statusLabel } from '../../shared/article'
import { ArticleCard } from '../components/ArticleCard'
import { Button } from '../components/Button'
import { GroupHeading } from '../components/Divider'
import { EmptySlot } from '../components/Field'
import { FrameBody } from '../components/Frame'
import { ListRow } from '../components/ListRow'
import { Notice } from '../components/Notice'
import { TitleBar } from '../components/TitleBar'
import { shortDate } from '../lib/when'
import { archivedArticles, recentArticles, unarchivedArticles } from './grouping'

/**
 * The Articles Area, as a list. The Board View is the same rows laid out by
 * status, and both read the one list the index answers with.
 *
 * **The tiles on top supplement the list rather than replacing rows in it.**
 * They are the three the writer touched last, lifted up where a glance finds
 * them, and each is still listed underneath — so scanning the list never means
 * remembering which Articles were taken out of it.
 *
 * Archived Articles are a group at the foot rather than a View of their own:
 * they sit on the same table, and a writer looking for one has come to this page
 * to find it.
 */

export interface ArticleListProps {
	articles: readonly ArticleEntry[]
	/** Until the first read answers. */
	loading?: boolean
	/** Why the list did not load, or why a write did not land. */
	failure?: string | null
	onOpen?: (id: string) => void
	onNew?: () => void
	onBoard?: () => void
	onRestore?: (id: string) => void
	className?: string
}

export function ArticleList({
	articles,
	loading = false,
	failure = null,
	onOpen,
	onNew,
	onBoard,
	onRestore,
	className,
}: ArticleListProps) {
	const working = unarchivedArticles(articles)
	const recent = recentArticles(articles)
	const archived = archivedArticles(articles)

	return (
		<>
			<TitleBar
				className={className}
				title="Articles"
				actions={
					<>
						<Button onClick={onBoard} size="sm" variant="quiet">
							board view
						</Button>
						<Button onClick={onNew} size="sm" variant="accent">
							+ new article
						</Button>
					</>
				}
			/>
			<FrameBody className="gap-6 overflow-y-auto p-4">
				{failure === null ? null : <Notice>{failure}</Notice>}

				{recent.length === 0 ? null : (
					<div className="flex flex-col gap-3">
						<GroupHeading>Recent</GroupHeading>
						<div className="flex flex-wrap gap-3">
							{recent.map((article) => (
								<ArticleCard article={article} key={article.id} onOpen={onOpen} />
							))}
						</div>
					</div>
				)}

				<div className="flex flex-col gap-1">
					<GroupHeading className="mb-1.5" count={working.length}>
						In progress
					</GroupHeading>
					{loading ? (
						<p className="text-[0.75rem] text-faint">Opening your Articles…</p>
					) : working.length === 0 ? (
						<EmptySlot className="min-h-[3.5rem]">
							Nothing here yet — start an Article and it appears in this list
						</EmptySlot>
					) : (
						working.map((article) => (
							<ArticleRow
								article={article}
								key={article.id}
								onOpen={onOpen}
								when={article.createdAt}
							/>
						))
					)}
				</div>

				{archived.length === 0 ? null : (
					<div className="flex flex-col gap-1">
						<GroupHeading className="mb-1.5" count={archived.length}>
							Archived
						</GroupHeading>
						{archived.map((article) => (
							<ArticleRow
								action={
									<Button
										onClick={() => onRestore?.(article.id)}
										size="sm"
										variant="quiet"
									>
										restore
									</Button>
								}
								article={article}
								dimmed
								key={article.id}
								onOpen={onOpen}
								when={article.archivedAt ?? article.createdAt}
							/>
						))}
					</div>
				)}
			</FrameBody>
		</>
	)
}

/** One line of either list: the title opens the Article, the status sits beside
 * it, and the date is the one the group is about. */
function ArticleRow({
	article,
	when,
	action,
	dimmed = false,
	onOpen,
}: {
	article: ArticleEntry
	when: number
	action?: ReactNode
	dimmed?: boolean
	onOpen?: (id: string) => void
}) {
	return (
		<ListRow
			dimmed={dimmed}
			note={statusLabel[article.status]}
			title={
				<button
					className="truncate text-left hover:underline"
					onClick={() => onOpen?.(article.id)}
					type="button"
				>
					{articleTitle(article)}
				</button>
			}
			trailing={
				<>
					<span className="text-[0.6875rem] text-faint">{shortDate(when)}</span>
					{action}
				</>
			}
		/>
	)
}
