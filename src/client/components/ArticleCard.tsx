import { cx } from '../lib/cx'
import type { Article } from '../mock/content'
import { Chip } from './Chip'
import { ProgressBar } from './ProgressBar'

export interface ArticleCardProps {
	article: Article
	/** `card` is the desk's active tile; `column` is the board's smaller tile. */
	variant?: 'card' | 'column'
	className?: string
}

/**
 * An in-progress article. The progress bar is deliberately unlabelled — the
 * status word underneath is the honest signal; the bar is just a shape.
 */
export function ArticleCard({ article, variant = 'card', className }: ArticleCardProps) {
	const compact = variant === 'column'

	return (
		<article
			className={cx(
				'flex flex-col gap-2 rounded-lg border border-edge bg-surface p-3 transition-colors hover:border-ink/25',
				compact ? 'gap-1.5 p-2.5' : 'w-[10.5rem]',
				className,
			)}
		>
			<h3
				className={cx(
					'leading-snug font-semibold text-ink',
					compact ? 'text-[0.8125rem]' : 'text-[0.875rem]',
				)}
			>
				{article.title}
			</h3>
			{!compact ? (
				<p className="line-clamp-2 text-[0.75rem] leading-relaxed text-muted">
					{article.blurb}
				</p>
			) : null}
			<ProgressBar value={article.progress} className="mt-0.5" />
			<p className="text-[0.6875rem] text-faint">{article.statusLabel}</p>
			{article.voice || article.chips?.length ? (
				<div className="flex flex-wrap gap-1.5">
					{article.voice ? <Chip variant="outline">{article.voice}</Chip> : null}
					{article.chips?.map((chip) => (
						<Chip key={chip} variant={article.needsAttention ? 'accent' : 'default'}>
							{chip}
						</Chip>
					))}
				</div>
			) : null}
		</article>
	)
}
