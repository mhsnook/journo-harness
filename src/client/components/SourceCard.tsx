import { cx } from '../lib/cx'
import type { Source } from '../mock/content'
import { Button } from './Button'
import { Check } from './Check'
import { Chip } from './Chip'

export interface SourceCardProps {
	source: Source
	/**
	 * `offer` is how a source arrives in the chat (keep / cut).
	 * `ledger` is the same source once it has a state (tick to accept).
	 */
	variant?: 'offer' | 'ledger'
	/** Hide the summary line — the ledger runs tighter than the chat. */
	compact?: boolean
	className?: string
}

/** The star that marks a source as coming from your favourites. */
function FavouriteMark({ kind }: { kind: 'author' | 'publication' }) {
	return (
		<span className="inline-flex items-center gap-1 text-accent-ink">
			<span aria-hidden>★</span>
			<span>favourite {kind}</span>
		</span>
	)
}

/**
 * A research result. The same row appears in the chat when it is offered, in
 * the ledger while you decide, and in the plan once it is accepted — the state
 * changes, the row does not.
 */
export function SourceCard({
	source,
	variant = 'offer',
	compact = false,
	className,
}: SourceCardProps) {
	const cut = source.state === 'cut'

	return (
		<article
			className={cx(
				'flex gap-2.5 rounded-lg border border-edge bg-surface p-2.5',
				cut && 'opacity-50',
				className,
			)}
		>
			{variant === 'ledger' && !cut ? (
				<Check checked={source.state === 'accepted'} label={`Accept ${source.title}`} />
			) : null}
			{variant === 'ledger' && cut ? (
				<span className="label-meta mt-0.5 shrink-0">cut</span>
			) : null}

			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<h4 className="text-[0.8125rem] leading-snug font-semibold text-ink">
					{source.title}
				</h4>
				<p className="flex flex-wrap items-center gap-x-1.5 text-[0.6875rem] text-faint">
					{source.favourite ? <FavouriteMark kind={source.favourite} /> : null}
					{[source.author, source.outlet, source.year].filter(Boolean).map((part, i) => (
						<span key={part as string}>
							{i > 0 || source.favourite ? <span aria-hidden>· </span> : null}
							{part}
						</span>
					))}
				</p>
				{!compact && source.summary ? (
					<p className="text-[0.75rem] leading-relaxed text-muted">{source.summary}</p>
				) : null}
				{source.quotes ? (
					<div className="mt-0.5 flex flex-wrap gap-1.5">
						{Array.from({ length: source.quotes }, (_, i) => (
							<Chip key={i} tone="outline" interactive>
								quote {i + 1}
							</Chip>
						))}
					</div>
				) : null}
				{variant === 'ledger' && source.state === 'undecided' ? (
					<span className="text-[0.6875rem] text-faint">undecided</span>
				) : null}
			</div>

			{variant === 'offer' ? (
				<div className="flex shrink-0 flex-col gap-1.5">
					<Button size="sm">keep</Button>
					<Button size="sm" tone="quiet">
						cut
					</Button>
				</div>
			) : null}
			{variant === 'ledger' && cut ? (
				<Button size="sm" tone="link" className="self-start">
					restore
				</Button>
			) : null}
		</article>
	)
}
