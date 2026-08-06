import { cx } from '../lib/cx'
import type { Quote } from '../mock/content'
import { Chip } from './Chip'

export interface QuoteRowProps {
	quote: Quote
	/** Show a used/ready marker instead of the bare section chip. */
	showUsage?: boolean
	dimmed?: boolean
	className?: string
}

/**
 * A saved quote, tagged with the section it belongs to. An em dash in place of
 * a section number means it is kept but not placed yet.
 */
export function QuoteRow({
	quote,
	showUsage = false,
	dimmed = false,
	className,
}: QuoteRowProps) {
	return (
		<div className={cx('flex items-start gap-2.5', dimmed && 'opacity-50', className)}>
			<Chip tone={quote.section ? 'default' : 'muted'} className="mt-px">
				{quote.section ?? '—'}
			</Chip>
			<blockquote
				className={cx(
					'min-w-0 flex-1 border-l-2 pl-2.5',
					quote.used ? 'border-accent-edge' : 'border-rule',
				)}
			>
				<p className="text-[0.8125rem] leading-relaxed text-ink">“{quote.text}”</p>
				<footer className="mt-1 flex items-center gap-2 text-[0.6875rem] text-faint">
					<cite className="not-italic">{quote.attribution}</cite>
					{showUsage ? (
						<span className={quote.used ? 'text-accent-ink' : undefined}>
							· {quote.used ? 'used' : 'ready'}
						</span>
					) : null}
				</footer>
			</blockquote>
		</div>
	)
}
