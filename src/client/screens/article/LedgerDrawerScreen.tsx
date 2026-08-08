import { useState } from 'react'

import type { Disposition } from '../../../shared/offer'
import { ArticleBar } from '../../components/ArticleBar'
import { Chip } from '../../components/Chip'
import { EmptySlot } from '../../components/Field'
import { Frame, FrameBody } from '../../components/Frame'
import { Panel } from '../../components/Panel'
import { ReferenceCard } from '../../components/ReferenceCard'
import { useArticle } from '../../lib/article'
import { useOfferLedger } from '../../lib/useOfferLedger'
import { ARTICLE_TITLE } from '../../mock/content'
import { PlanPanel } from '../../plan/PlanPanel'

type Filter = 'all' | Disposition

const filters: Filter[] = ['all', 'undecided', 'accepted', 'declined']

/**
 * 2(f) — The Offer ledger, open over the Chat.
 *
 * The Ledger is a view on the Chat Panel and covers only that half: it is the
 * record of what the Chat offered and what the writer ruled, and the `close ×`
 * is on it because it is the half that opened. Accepting sends the Reference
 * across.
 *
 * The Plan Panel beside it is the ordinary one, rendered here so the screen
 * reads as the writer meets it. Nothing on this screen reaches into it — where
 * a Reference sits, and which sit nowhere yet, are its own to show.
 */
export function LedgerDrawerScreen() {
	const { plan, edit } = useArticle()
	const { ledger, loading, failure, accept, decline, restore } = useOfferLedger()
	const [filter, setFilter] = useState<Filter>('all')

	const shown = filter === 'all' ? ledger.offers : ledger.byDisposition[filter]

	return (
		<Frame width={820}>
			<ArticleBar title={ARTICLE_TITLE} open={['chat', 'plan']} status="ledger" />
			<FrameBody row className="h-[22rem]">
				<Panel divider="right" padded={false}>
					{/* Sticky: the Panel scrolls under it, and `close ×` has to stay reachable. */}
					<header className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-edge bg-sunk px-3.5 py-2.5">
						<h3 className="text-[0.875rem] font-semibold text-ink">Offered</h3>
						<span className="text-[0.75rem] text-faint">
							{ledger.counts.all} · {ledger.counts.accepted} Accepted
						</span>
						<button
							type="button"
							className="ml-auto text-[0.75rem] text-faint hover:text-ink"
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
									{name} · {ledger.counts[name]}
								</Chip>
							))}
						</div>
						{failure ? <p className="text-[0.75rem] text-ink">{failure}</p> : null}
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
						<p className="text-[0.6875rem] text-faint">
							Accepting one copies it across →
						</p>
					</div>
				</Panel>

				<PlanPanel plan={plan} edit={edit} />
			</FrameBody>
		</Frame>
	)
}
