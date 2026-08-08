import type { ArticleEntry } from '../../shared/article'
import { ArticleCard } from '../components/ArticleCard'
import { Button } from '../components/Button'
import { FrameBody } from '../components/Frame'
import { MetaLabel } from '../components/MetaLabel'
import { Notice } from '../components/Notice'
import { TitleBar } from '../components/TitleBar'
import { boardColumns } from './grouping'

/**
 * The Board View: the same unarchived Articles the list shows, in a column each
 * by status.
 *
 * **Reading only.** There is no drag-and-drop here, and a card carries no
 * control — the writer sets an Article's status on the Article screen, which is
 * where they are when they decide it has moved on. The columns keep their width
 * and the Board scrolls sideways rather than squeezing four columns into a
 * phone.
 */

export interface BoardViewProps {
	articles: readonly ArticleEntry[]
	/** Until the first read answers. */
	loading?: boolean
	failure?: string | null
	onOpen?: (id: string) => void
	onNew?: () => void
	onBack?: () => void
	className?: string
}

export function BoardView({
	articles,
	loading = false,
	failure = null,
	onOpen,
	onNew,
	onBack,
	className,
}: BoardViewProps) {
	const columns = boardColumns(articles)

	return (
		<>
			<TitleBar
				actions={
					<Button onClick={onNew} size="sm" variant="accent">
						+ new article
					</Button>
				}
				back="Articles"
				className={className}
				onBack={onBack}
				subtitle="by status"
				title="Board"
			/>
			{failure === null ? null : (
				<div className="px-4 pt-4">
					<Notice>{failure}</Notice>
				</div>
			)}
			<FrameBody className="gap-3 overflow-x-auto p-4" row>
				{loading ? (
					<p className="text-[0.75rem] text-faint">Opening your Articles…</p>
				) : (
					columns.map((column) => (
						<div
							className="flex w-[13rem] shrink-0 flex-col gap-2 overflow-y-auto"
							key={column.status}
						>
							<MetaLabel className="shrink-0" count={column.articles.length}>
								{column.label}
							</MetaLabel>
							{column.articles.map((article) => (
								<ArticleCard
									article={article}
									className="shrink-0"
									key={article.id}
									onOpen={onOpen}
									variant="column"
								/>
							))}
						</div>
					))
				)}
			</FrameBody>
		</>
	)
}
