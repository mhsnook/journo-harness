import { cx } from '../lib/cx'
import type { Reference } from '../mock/content'
import { Button } from './Button'
import { Check } from './Check'
import { Chip } from './Chip'

export interface ReferenceCardProps {
	reference: Reference
	/**
	 * `offer` is how a Reference arrives in the chat, to Accept or Decline.
	 * `ledger` is the same Reference once it carries a disposition.
	 */
	variant?: 'offer' | 'ledger'
	/** Hide the summary line — the ledger runs tighter than the chat. */
	compact?: boolean
	className?: string
}

/** The star that marks a reference as coming from your favourites. */
function FavouriteMark({ type }: { type: 'author' | 'publication' }) {
	return (
		<span className="inline-flex items-center gap-1 text-accent-ink">
			<span aria-hidden>★</span>
			<span>favourite {type}</span>
		</span>
	)
}

/**
 * A research result. The same row appears in the chat when it is offered, in
 * the ledger while you decide, and in the plan once it is accepted — the state
 * changes, the row does not.
 */
export function ReferenceCard({
	reference,
	variant = 'offer',
	compact = false,
	className,
}: ReferenceCardProps) {
	const declined = reference.state === 'declined'

	return (
		<article
			className={cx(
				'flex gap-2.5 rounded-lg border border-edge bg-surface p-2.5',
				declined && 'opacity-50',
				className,
			)}
		>
			{variant === 'ledger' && !declined ? (
				<Check
					checked={reference.state === 'accepted'}
					label={`Accept ${reference.title}`}
				/>
			) : null}
			{variant === 'ledger' && declined ? (
				<span className="label-meta mt-0.5 shrink-0">declined</span>
			) : null}

			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<h4 className="text-[0.8125rem] leading-snug font-semibold text-ink">
					{reference.title}
				</h4>
				<p className="flex flex-wrap items-center gap-x-1.5 text-[0.6875rem] text-faint">
					{reference.favourite ? <FavouriteMark type={reference.favourite} /> : null}
					{[reference.author, reference.outlet, reference.year]
						.filter(Boolean)
						.map((part, i) => (
							<span key={part as string}>
								{i > 0 || reference.favourite ? <span aria-hidden>· </span> : null}
								{part}
							</span>
						))}
				</p>
				{!compact && reference.summary ? (
					<p className="text-[0.75rem] leading-relaxed text-muted">{reference.summary}</p>
				) : null}
				{reference.quotes ? (
					<div className="mt-0.5 flex flex-wrap gap-1.5">
						{Array.from({ length: reference.quotes }, (_, i) => (
							<Chip key={i} variant="outline" interactive>
								quote {i + 1}
							</Chip>
						))}
					</div>
				) : null}
				{variant === 'ledger' && reference.state === 'undecided' ? (
					<span className="text-[0.6875rem] text-faint">undecided</span>
				) : null}
			</div>

			{variant === 'offer' ? (
				<div className="flex shrink-0 flex-col gap-1.5">
					<Button size="sm">keep</Button>
					<Button size="sm" variant="quiet">
						declined
					</Button>
				</div>
			) : null}
			{variant === 'ledger' && declined ? (
				<Button size="sm" variant="link" className="self-start">
					restore
				</Button>
			) : null}
		</article>
	)
}
