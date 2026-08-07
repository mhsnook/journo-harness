import { Chip } from '../../components/Chip'
import { Frame, FrameBody } from '../../components/Frame'
import { MetaLabel } from '../../components/MetaLabel'
import { useArticle } from '../../lib/article'
import { cx } from '../../lib/cx'
import { useOfferLedger } from '../../lib/useOfferLedger'
import { outlineEntries, sectionLabel } from '../../plan/outline'
import { referenceName, referencesAt, unplacedReferences } from '../../plan/references'

type Row = { key: string; text: string; section?: string }
type Group = { label: string; rows: Row[]; variant?: 'ready' | 'plain' | 'declined' }

/**
 * 2(g) — The Offer ledger opened from the composer. The groups *are* the
 * lifecycle and their order is fixed, so the Undecided pile visibly shrinks as
 * you work. Used waits on the Draft, at phase 2.
 */
export function LedgerPopoverScreen() {
	const { plan } = useArticle()
	const { ledger } = useOfferLedger()

	const groups: Group[] = [
		{
			label: 'Ready in the Plan',
			variant: 'ready',
			rows: outlineEntries(plan.outline).flatMap((entry) =>
				referencesAt(plan, entry.node.id).map(({ reference }) => ({
					key: reference.id,
					text: referenceName(reference),
					section: sectionLabel(entry),
				})),
			),
		},
		{
			label: 'Accepted, no Section yet',
			rows: unplacedReferences(plan).map((reference) => ({
				key: reference.id,
				text: referenceName(reference),
			})),
		},
		{
			label: 'Accepted, and not in the Plan',
			rows: ledger.stranded.map((offer) => ({
				key: offer.id,
				text: referenceName(offer),
			})),
		},
		{
			label: 'Offered, Undecided',
			rows: ledger.byDisposition.undecided.map((offer) => ({
				key: offer.id,
				text: referenceName(offer),
			})),
		},
		{
			label: 'Declined',
			variant: 'declined',
			rows: ledger.byDisposition.declined.map((offer) => ({
				key: offer.id,
				text: referenceName(offer),
			})),
		},
	]

	return (
		<Frame width={340}>
			<div className="flex items-center gap-2.5 border-b border-edge bg-sunk px-3.5 py-2.5">
				<h3 className="text-[0.875rem] font-semibold text-ink">Offer ledger</h3>
				<span className="text-[0.75rem] text-faint">{ledger.counts.all}</span>
				<button
					type="button"
					className="ml-auto text-[0.75rem] text-faint hover:text-ink"
				>
					⌄
				</button>
			</div>
			<FrameBody className="gap-4 p-3.5">
				{groups
					.filter((group) => group.rows.length > 0)
					.map((group) => (
						<section
							key={group.label}
							className={cx(
								'flex flex-col gap-1.5',
								group.variant === 'declined' && 'opacity-50',
							)}
						>
							<MetaLabel count={group.rows.length}>{group.label}</MetaLabel>
							{group.rows.map((row) => (
								<div key={row.key} className="flex items-start gap-2">
									{row.section ? (
										<Chip variant={group.variant === 'ready' ? 'accent' : 'outline'}>
											{row.section}
										</Chip>
									) : null}
									<p className="min-w-0 flex-1 truncate text-[0.75rem] text-muted">
										{row.text}
									</p>
								</div>
							))}
						</section>
					))}
			</FrameBody>
		</Frame>
	)
}
