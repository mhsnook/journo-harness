import type { ReactNode } from 'react'

import type { Offer } from '../../shared/offer'
import { cx } from '../lib/cx'
import { attribution, referenceName } from '../plan/references'
import { Button } from './Button'
import { Check } from './Check'
import { Chip } from './Chip'
import { CitedLine } from './CitedLine'
import { SourceLink } from './SourceLink'

export interface ReferenceCardProps {
	offer: Offer
	variant?: 'offer' | 'ledger'
	compact?: boolean
	/** Waits on the House, at 1b. */
	favourite?: 'author' | 'publication'
	onAccept?: () => void
	onDecline?: () => void
	onRestore?: () => void
	className?: string
}

function FavouriteMark({ type }: { type: 'author' | 'publication' }) {
	return (
		<span className="inline-flex items-center gap-1 text-accent-ink">
			<span aria-hidden>★</span>
			<span>favourite {type}</span>
		</span>
	)
}

/** One Offer, in the Chat and in the Offer ledger alike. */
export function ReferenceCard({
	offer,
	variant = 'offer',
	compact = false,
	favourite,
	onAccept,
	onDecline,
	onRestore,
	className,
}: ReferenceCardProps) {
	const declined = offer.disposition === 'declined'
	const accepted = offer.disposition === 'accepted'
	const ruled = accepted || declined
	const heading = referenceName(offer)
	// A Quote with no source is its own heading; do not print it twice.
	const passage = offer.text !== undefined && offer.text !== heading
	const url = offer.source?.url
	// The heading is the passage on a Quote, and underlining a whole passage
	// reads as emphasis rather than as a link, so that one takes its url on the
	// line below instead.
	const headingLinks = url !== undefined && offer.text === undefined
	const cited: ReactNode[] = [
		...(favourite ? [<FavouriteMark key="favourite" type={favourite} />] : []),
		...attribution(offer.source),
		...(url !== undefined && !headingLinks
			? [<SourceLink className="break-all" key="url" url={url} />]
			: []),
	]

	return (
		<article
			className={cx(
				'flex gap-2.5 rounded-lg border border-edge bg-surface p-2.5',
				declined && 'opacity-50',
				className,
			)}
		>
			{variant === 'ledger' && !declined ? (
				// No handler once Accepted, which disables the tick: restoring undoes a
				// Decline and nothing undoes an Accept, so there is no state to go back to.
				<Check
					checked={accepted}
					label={`Accept ${heading}`}
					onChange={accepted ? undefined : onAccept}
				/>
			) : null}
			{variant === 'ledger' && declined ? (
				<span className="label-meta mt-0.5 shrink-0">declined</span>
			) : null}

			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<h4 className="text-[0.8125rem] leading-snug font-semibold text-ink">
					{headingLinks ? <SourceLink url={url}>{heading}</SourceLink> : heading}
				</h4>
				<CitedLine parts={cited} />
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
				</div>
			</div>

			{variant === 'offer' && !ruled ? (
				<div className="flex shrink-0 flex-col gap-1.5">
					<Button size="sm" onClick={onAccept}>
						Accept
					</Button>
					<Button size="sm" variant="quiet" onClick={onDecline}>
						Decline
					</Button>
				</div>
			) : null}
			{/* A card in the Chat reports a ruling rather than offering it again.
			    Declining one already Accepted would leave its copy in the Plan, and
			    the Ledger is where a ruling is changed. */}
			{variant === 'offer' && ruled ? (
				<span className="label-meta mt-0.5 shrink-0">{offer.disposition}</span>
			) : null}
			{variant === 'ledger' && declined ? (
				<Button size="sm" variant="link" className="self-start" onClick={onRestore}>
					Restore
				</Button>
			) : null}
		</article>
	)
}
