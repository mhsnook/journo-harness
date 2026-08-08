import { type ArticleEntry, articleTitle, statusLabel } from '../../shared/article'
import { cx } from '../lib/cx'
import { shortDate } from '../lib/when'
import { Chip } from './Chip'

export interface ArticleCardProps {
	article: ArticleEntry
	/** `card` is the index's tile; `column` is the Board View's smaller one. */
	variant?: 'card' | 'column'
	/** Renders the tile as a button. Omit it and the tile is a static one. */
	onOpen?: (id: string) => void
	className?: string
}

/**
 * One Article, as the index knows it. The index carries a title, a status, and
 * two timestamps, so that is what a tile shows — nothing here reaches into an
 * Article Agent to count words or read the Plan.
 *
 * The date is the day the Article was started. The index has no honest "last
 * worked on": a Plan edit goes to the Article Agent and never touches the table
 * this row comes from.
 */
export function ArticleCard({
	article,
	variant = 'card',
	onOpen,
	className,
}: ArticleCardProps) {
	const compact = variant === 'column'
	const Tag = (onOpen ? 'button' : 'article') as 'button'

	return (
		<Tag
			{...(onOpen ? { type: 'button' as const, onClick: () => onOpen(article.id) } : {})}
			className={cx(
				'flex flex-col items-start gap-2 rounded-lg border border-edge bg-surface p-3 text-left transition-colors',
				onOpen && 'hover:border-ink/25',
				compact ? 'gap-1.5 p-2.5' : 'w-[10.5rem]',
				className,
			)}
		>
			<h3
				className={cx(
					'w-full leading-snug font-semibold break-words text-ink',
					compact ? 'text-[0.8125rem]' : 'text-[0.875rem]',
					article.title.trim() === '' && 'text-faint',
				)}
			>
				{articleTitle(article)}
			</h3>
			<div className="flex flex-wrap items-center gap-1.5">
				<Chip variant="outline">{statusLabel[article.status]}</Chip>
				<span className="text-[0.6875rem] text-faint">
					started {shortDate(article.createdAt)}
				</span>
			</div>
		</Tag>
	)
}
