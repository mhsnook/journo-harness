import { useState } from 'react'

import type { Disposition } from '../../../shared/offer'
import { ArticleBar } from '../../components/ArticleBar'
import { Chip } from '../../components/Chip'
import { EmptySlot } from '../../components/Field'
import { Frame, FrameBody } from '../../components/Frame'
import { MetaLabel } from '../../components/MetaLabel'
import { Panel } from '../../components/Panel'
import { QuoteRow } from '../../components/QuoteRow'
import { ReferenceCard } from '../../components/ReferenceCard'
import { useArticle } from '../../lib/article'
import { useOfferLedger } from '../../lib/useOfferLedger'
import { ARTICLE_TITLE } from '../../mock/content'
import { outlineEntries, sectionLabel } from '../../plan/outline'
import { referenceName, referencesAt } from '../../plan/references'

type Filter = 'all' | Disposition

const filters: Filter[] = ['all', 'undecided', 'accepted', 'declined']

/**
 * 2(f) — The Offer ledger, as two equal halves. Left is what has been offered
 * and nothing else; right is the Plan, with Accepted items sitting under the
 * Section they are placed at.
 *
 * It is the same list at every stage — early on most rows read Undecided, later
 * most are placed. That is why there is no separate triage screen.
 */
export function LedgerDrawerScreen() {
	const { plan } = useArticle()
	const { ledger, loading, failure, accept, decline, restore, addToPlan } =
		useOfferLedger()
	const [filter, setFilter] = useState<Filter>('all')

	const shown = filter === 'all' ? ledger.offers : ledger.byDisposition[filter]
	const stranded = new Set(ledger.stranded.map((offer) => offer.id))
	const unplaced = plan.references.filter((reference) => reference.nodeId === null)

	return (
		<Frame width={820}>
			<ArticleBar title={ARTICLE_TITLE} open={['chat', 'plan']} status="ledger" />
			<FrameBody row className="min-h-[22rem]">
				<Panel divider="right" padded={false}>
					<header className="flex items-center gap-2.5 border-b border-edge bg-sunk px-3.5 py-2.5">
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
								inThePlan={!stranded.has(offer.id)}
								onAccept={() => accept(offer)}
								onDecline={() => decline(offer)}
								onRestore={() => restore(offer)}
								onAddToPlan={() => addToPlan(offer)}
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

				<Panel variant="sunk" padded={false}>
					<header className="flex items-center gap-2.5 border-b border-edge px-3.5 py-2.5">
						<h3 className="text-[0.875rem] font-semibold text-ink">In the Plan</h3>
						<span className="text-[0.75rem] text-faint">
							{plan.references.length} References
						</span>
					</header>
					<div className="flex flex-col gap-4 p-3.5">
						{outlineEntries(plan.outline).map((entry) => {
							const held = referencesAt(plan, entry.node.id)

							return (
								<div key={entry.node.id} className="flex flex-col gap-2">
									<MetaLabel>
										{sectionLabel(entry)} · {entry.node.title}
									</MetaLabel>
									{held.length === 0 ? (
										<EmptySlot className="ml-2">
											Place an Accepted Reference here
										</EmptySlot>
									) : (
										<div className="flex flex-col gap-2.5 pl-2">
											{held.map(({ reference }) => (
												<QuoteRow
													key={reference.id}
													reference={reference}
													section={sectionLabel(entry)}
													showUsage
												/>
											))}
										</div>
									)}
								</div>
							)
						})}

						{unplaced.length > 0 ? (
							<div className="flex flex-col gap-1.5">
								<MetaLabel count={unplaced.length}>Accepted, no Section yet</MetaLabel>
								<p className="text-[0.75rem] text-muted">
									{unplaced.map(referenceName).join(' · ')}
								</p>
							</div>
						) : null}

						{/* Accepted with nothing in the Plan at all, which is not the group
						    above: that one is a Reference waiting for a Section. */}
						{ledger.stranded.length > 0 ? (
							<div className="flex flex-col gap-1.5">
								<MetaLabel count={ledger.stranded.length}>
									Accepted, and not in the Plan
								</MetaLabel>
								<p className="text-[0.75rem] text-muted">
									{ledger.stranded.map(referenceName).join(' · ')}
								</p>
							</div>
						) : null}
					</div>
				</Panel>
			</FrameBody>
		</Frame>
	)
}
