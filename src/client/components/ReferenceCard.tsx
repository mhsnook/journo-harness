import type { Offer } from '../../shared/offer'
import { cx } from '../lib/cx'
import { attribution, referenceHeading } from '../lib/reference'
import { Button } from './Button'
import { Check } from './Check'
import { Chip } from './Chip'

export interface ReferenceCardProps {
	offer: Offer
	/**
	 * `offer` is how one arrives in the Chat, to Accept or Decline. `ledger` is
	 * the same Offer once it carries a disposition.
	 */
	variant?: 'offer' | 'ledger'
	/** Hide the note — the Offer ledger runs tighter than the Chat. */
	compact?: boolean
	/**
	 * Whether the Plan holds a copy of this Offer. An Accepted Offer with no
	 * copy is stranded, and the card offers the writer the re-add.
	 */
	inThePlan?: boolean
	/** Waits on the House, which arrives at 1b — nothing in 1a computes it. */
	favourite?: 'author' | 'publication'
	onAccept?: () => void
	onDecline?: () => void
	onRestore?: () => void
	onAddToPlan?: () => void
	className?: string
}

/** The star that marks a Reference as coming from your favourites. */
function FavouriteMark({ type }: { type: 'author' | 'publication' }) {
	return (
		<span className="inline-flex items-center gap-1 text-accent-ink">
			<span aria-hidden>★</span>
			<span>favourite {type}</span>
		</span>
	)
}

/**
 * One Offer. The same card appears in the Chat when it is offered and in the
 * Offer ledger while the writer decides — the disposition changes, the card
 * does not.
 */
export function ReferenceCard({
	offer,
	variant = 'offer',
	compact = false,
	inThePlan = true,
	favourite,
	onAccept,
	onDecline,
	onRestore,
	onAddToPlan,
	className,
}: ReferenceCardProps) {
	const declined = offer.disposition === 'declined'
	const accepted = offer.disposition === 'accepted'
	const heading = referenceHeading(offer)
	// A Quote pulled without a source is its own heading, so printing the
	// passage again below it would say one thing twice.
	const passage = offer.text !== undefined && offer.text !== heading

	return (
		<article
			className={cx(
				'flex gap-2.5 rounded-lg border border-edge bg-surface p-2.5',
				declined && 'opacity-50',
				className,
			)}
		>
			{variant === 'ledger' && !declined ? (
				<Check checked={accepted} label={`Accept ${heading}`} onChange={onAccept} />
			) : null}
			{variant === 'ledger' && declined ? (
				<span className="label-meta mt-0.5 shrink-0">declined</span>
			) : null}

			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<h4 className="text-[0.8125rem] leading-snug font-semibold text-ink">
					{heading}
				</h4>
				<p className="flex flex-wrap items-center gap-x-1.5 text-[0.6875rem] text-faint">
					{favourite ? <FavouriteMark type={favourite} /> : null}
					{attribution(offer.source).map((part, index) => (
						<span key={part}>
							{index > 0 || favourite ? <span aria-hidden>· </span> : null}
							{part}
						</span>
					))}
				</p>
				{passage ? (
					<blockquote className="border-l-2 border-rule pl-2 text-[0.75rem] leading-relaxed text-ink">
						“{offer.text}”
					</blockquote>
				) : null}
				{!compact && offer.note !== undefined ? (
					<p className="text-[0.75rem] leading-relaxed text-muted">{offer.note}</p>
				) : null}
				<div className="mt-0.5 flex flex-wrap items-center gap-1.5">
					{offer.type === 'quote' ? <Chip variant="outline">quote</Chip> : null}
					{variant === 'ledger' && offer.disposition === 'undecided' ? (
						<span className="text-[0.6875rem] text-faint">undecided</span>
					) : null}
					{accepted && !inThePlan ? (
						<span className="text-[0.6875rem] text-faint">
							Accepted, and not in the Plan
						</span>
					) : null}
				</div>
			</div>

			{variant === 'offer' ? (
				<div className="flex shrink-0 flex-col gap-1.5">
					<Button size="sm" onClick={onAccept}>
						Accept
					</Button>
					<Button size="sm" variant="quiet" onClick={onDecline}>
						Decline
					</Button>
				</div>
			) : null}
			{variant === 'ledger' && declined ? (
				<Button size="sm" variant="link" className="self-start" onClick={onRestore}>
					Restore
				</Button>
			) : null}
			{variant === 'ledger' && accepted && !inThePlan ? (
				<Button size="sm" variant="link" className="self-start" onClick={onAddToPlan}>
					Add to the Plan
				</Button>
			) : null}
		</article>
	)
}
