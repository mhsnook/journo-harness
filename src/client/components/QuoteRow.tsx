import type { Reference } from '../../shared/plan'
import { cx } from '../lib/cx'
import { citation, referenceName } from '../plan/references'
import { Chip } from './Chip'

export interface QuoteRowProps {
	reference: Reference
	/** An em dash where the caller passes none. */
	section?: string
	/** Unused till phase 2. */
	used?: boolean
	showUsage?: boolean
	dimmed?: boolean
	className?: string
}

export function QuoteRow({
	reference,
	section,
	used = false,
	showUsage = false,
	dimmed = false,
	className,
}: QuoteRowProps) {
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
					{referenceName(reference)}
				</p>
				<footer className="mt-1 flex items-center gap-2 text-[0.6875rem] text-faint">
					<cite className="not-italic">{citation(reference)}</cite>
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
