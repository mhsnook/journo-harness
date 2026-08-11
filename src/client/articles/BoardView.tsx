import type { ArticleEntry } from '../../shared/article'
import { ArticleCard } from '../components/ArticleCard'
import { Button } from '../components/Button'
import { FrameBody } from '../components/Frame'
import { MetaLabel } from '../components/MetaLabel'
import { Notice } from '../components/Notice'
import { BackLink, TitleBar } from '../components/TitleBar'
import { cx } from '../lib/cx'
import { boardColumns } from './grouping'

/**
 * A column's width, and the one number the Board's layout turns on.
 *
 * The columns grow to share the rail, so any window with room for four takes
 * four even quarters and no sideways scroll — never four columns and a gap on
 * the right.
 *
 * 307px is where growing stops and scrolling starts: a quarter of the rail at a
 * 1298px window, once three 12px gaps and the rail's own 16px of padding each
 * side are out. Narrower than that, the columns hold 307px and the Board
 * scrolls sideways until 30% of the rail is the smaller number (≈1055px, with
 * two thirds of Done off the end), and from there every column shrinks
 * together. 16rem is the floor: past it the columns hold their width again and
 * more of the Board's right-hand end goes into the scroll zone.
 */
const columnWidth = 'grow basis-[clamp(16rem,30%,307px)]'

/**
 * The hairline in the gutter, standing in for the fill each column used to
 * carry. It is one card tall because it marks where a column starts rather than
 * fencing the whole of it, and it sits half a gutter left of the column edge,
 * which centres it in the gap.
 */
const columnDivider =
	'before:absolute before:top-0 before:-left-1.5 before:h-24 before:w-px before:bg-rule'

/**
 * The Board View: the same unarchived Articles the list shows, by status.
 *
 * **Reading only** — no drag-and-drop, and no control on a card. The writer sets
 * a status on the Article screen, which is where they are when they decide the
 * piece has moved on.
 */

export interface BoardViewProps {
	articles: readonly ArticleEntry[]
	/** Why a write did not land. The read's own failure replaces the screen. */
	failure?: string | null
	onNew?: () => void
}

export function BoardView({ articles, failure = null, onNew }: BoardViewProps) {
	const columns = boardColumns(articles)

	return (
		<>
			<TitleBar
				actions={
					<Button onClick={onNew} size="sm" variant="accent">
						+ new article
					</Button>
				}
				back={<BackLink to="/">Articles</BackLink>}
				subtitle="by status"
				title="Board"
			/>
			{failure === null ? null : (
				<div className="px-4 pt-4">
					<Notice>{failure}</Notice>
				</div>
			)}
			<FrameBody className="gap-3 overflow-x-auto p-4" row>
				{columns.map((column, index) => (
					// A divider in the gutter and a rule under the label, so four columns
					// read as four. The column itself draws nothing, which is what lets
					// the gutter stay this narrow: the tiles are the only boxes here.
					<div
						className={cx(
							'relative flex shrink-0 flex-col gap-2',
							columnWidth,
							index === 0 ? null : columnDivider,
						)}
						key={column.status}
					>
						{/* The negative margin runs the rule to the middle of each gutter,
						    so the four rules meet and read as one line. */}
						<MetaLabel
							className="-mx-1.5 shrink-0 border-b border-rule px-1.5 pb-1.5"
							count={column.articles.length}
						>
							{column.label}
						</MetaLabel>
						{/* Each column scrolls its own Y. */}
						<div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
							{column.articles.map((article) => (
								<ArticleCard
									article={article}
									className="shrink-0"
									key={article.id}
									variant="column"
								/>
							))}
						</div>
					</div>
				))}
			</FrameBody>
		</>
	)
}
