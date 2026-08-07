import type { Reference } from '../../shared/plan'
import { cx } from '../lib/cx'
import { attribution, referenceHeading } from '../lib/reference'
import { Chip } from './Chip'

export interface QuoteRowProps {
	/** The Plan's copy, which the writer owns and may have edited. */
	reference: Reference
	/** Where it sits: "§2", and an em dash when it is Accepted but unplaced. */
	section?: string
	/**
	 * Whether the passage is in the Draft. There is no Draft until phase 2, so
	 * a placed Reference reads Ready until the caller says otherwise.
	 */
	used?: boolean
	showUsage?: boolean
	dimmed?: boolean
	className?: string
}

/**
 * One Quote in the Plan, tagged with the Section it is placed at. An em dash in
 * place of a Section number means it is Accepted but not placed yet.
 */
export function QuoteRow({
	reference,
	section,
	used = false,
	showUsage = false,
	dimmed = false,
	className,
}: QuoteRowProps) {
	const cite = reference.source?.title ?? attribution(reference.source).join(' · ')

	return (
		<div className={cx('flex items-start gap-2.5', dimmed && 'opacity-50', className)}>
			<Chip variant={section ? 'default' : 'muted'} className="mt-px">
				{section ?? '—'}
			</Chip>
			<blockquote
				className={cx(
					'min-w-0 flex-1 border-l-2 pl-2.5',
					used ? 'border-accent-edge' : 'border-rule',
				)}
			>
				<p className="text-[0.8125rem] leading-relaxed text-ink">
					“{reference.text ?? referenceHeading(reference)}”
				</p>
				<footer className="mt-1 flex items-center gap-2 text-[0.6875rem] text-faint">
					<cite className="not-italic">{cite}</cite>
					{showUsage ? (
						<span className={used ? 'text-accent-ink' : undefined}>
							· {used ? 'used' : 'ready'}
						</span>
					) : null}
				</footer>
			</blockquote>
		</div>
	)
}
