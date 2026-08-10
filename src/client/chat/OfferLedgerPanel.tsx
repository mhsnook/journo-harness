import { useState } from 'react'

import type { Disposition } from '../../shared/offer'
import { Chip } from '../components/Chip'
import { EmptySlot } from '../components/Field'
import { Notice } from '../components/Notice'
import { Panel, type PanelProps } from '../components/Panel'
import { ReferenceCard } from '../components/ReferenceCard'
import type { OfferLedgerHandle } from '../lib/useOfferLedger'

/**
 * The Offer ledger, open over the Chat — screen 2(f).
 *
 * It is a view on the Chat Panel and covers only that half: it is the record of
 * what the Chat offered and what the writer ruled, and `close ×` is on it
 * because it is the half that opened. Accepting sends the Reference across to
 * the Plan.
 *
 * It reads no Plan. Once the writer Accepts, where the Reference goes and which
 * Section it lands at are the Plan Panel's to show.
 */

type Filter = 'all' | Disposition

const filters: Filter[] = ['all', 'undecided', 'accepted', 'declined']

export interface OfferLedgerPanelProps {
	ledger: OfferLedgerHandle
	onClose: () => void
	divider?: PanelProps['divider']
	className?: string
}

export function OfferLedgerPanel({
	ledger,
	onClose,
	divider,
	className,
}: OfferLedgerPanelProps) {
	const { ledger: rows, loading, failure, accept, decline, restore } = ledger
	const [filter, setFilter] = useState<Filter>('all')

	const shown = filter === 'all' ? rows.offers : rows.byDisposition[filter]

	return (
		<Panel className={className} divider={divider} padded={false}>
			{/* Sticky: the Panel scrolls under it, and `close ×` has to stay reachable. */}
			<header className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-edge bg-sunk px-3.5 py-2.5">
				<h3 className="text-[0.875rem] font-semibold text-ink">Offer ledger</h3>
				<span className="text-[0.75rem] text-faint">
					{rows.counts.all} · {rows.counts.accepted} Accepted
				</span>
				<button
					type="button"
					className="ml-auto text-[0.75rem] text-faint hover:text-ink"
					onClick={onClose}
				>
					close ×
				</button>
			</header>
			<div className="flex flex-col gap-2.5 p-3.5">
				<div className="flex flex-wrap gap-1.5">
					{filters.map((name) => (
						<Chip
							key={name}
							variant={name === filter ? 'solid' : 'outline'}
							interactive
							onClick={() => setFilter(name)}
						>
							{name} · {rows.counts[name]}
						</Chip>
					))}
				</div>
				{failure === null ? null : <Notice>{failure}</Notice>}
				{loading ? <p className="text-[0.75rem] text-faint">Reading…</p> : null}
				{shown.map((offer) => (
					<ReferenceCard
						key={offer.id}
						offer={offer}
						variant="ledger"
						compact
						onAccept={() => accept(offer)}
						onDecline={() => decline(offer)}
						onRestore={() => restore(offer)}
					/>
				))}
				{!loading && shown.length === 0 ? (
					<EmptySlot>Nothing {filter === 'all' ? 'offered yet' : filter}</EmptySlot>
				) : null}
			</div>
		</Panel>
	)
}
