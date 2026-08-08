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
import { archivedArticles, unarchivedArticles } from './grouping'

/**
 * The Articles Area, as a list. The Board View is the same rows laid out by
 * status, and both read the one list the index answers with.
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

				<div className="flex flex-col gap-3">
					<GroupHeading count={working.length}>In progress</GroupHeading>
					{loading ? (
						<p className="text-[0.75rem] text-faint">Opening your Articles…</p>
					) : working.length === 0 ? (
						<EmptySlot className="min-h-[3.5rem]">
							Nothing here yet — start an Article and it appears in this list
						</EmptySlot>
					) : (
						<div className="flex flex-wrap gap-3">
							{working.map((article) => (
								<ArticleCard article={article} key={article.id} onOpen={onOpen} />
							))}
						</div>
					)}
				</div>

				{archived.length === 0 ? null : (
					<div className="flex flex-col gap-1">
						<GroupHeading className="mb-1.5" count={archived.length}>
							Archived
						</GroupHeading>
						{archived.map((article) => (
							<ListRow
								dimmed
								key={article.id}
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
										<span className="text-[0.6875rem] text-faint">
											{shortDate(article.archivedAt ?? article.createdAt)}
										</span>
										<Button
											onClick={() => onRestore?.(article.id)}
											size="sm"
											variant="quiet"
										>
											restore
										</Button>
									</>
								}
							/>
						))}
					</div>
				)}
			</FrameBody>
		</>
	)
}
