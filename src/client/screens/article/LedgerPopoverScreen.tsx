import { Chip } from '../../components/Chip'
import { Frame, FrameBody } from '../../components/Frame'
import { MetaLabel } from '../../components/MetaLabel'
import { cx } from '../../lib/cx'

interface Group {
	label: string
	count: number
	items: Array<{ text: string; section?: string }>
	variant?: 'used' | 'plain' | 'declined'
}

const groups: Group[] = [
	{
		label: 'Used in the draft',
		count: 3,
		variant: 'used',
		items: [
			{ section: '§2', text: 'Permit throughput in six mid-sized cities' },
			{ section: '§2', text: '“We did not decide to stop building…”' },
			{ section: '§1', text: 'Housing starts, quarterly series' },
		],
	},
	{
		label: 'In the plan, not yet used',
		count: 2,
		items: [
			{ section: '§3', text: 'Zoning and the missing middle' },
			{ section: '§4', text: 'The cost of discretionary review' },
		],
	},
	{
		label: 'Kept, unassigned',
		count: 4,
		items: [
			{ text: 'Review board minutes, 2019–2024' },
			{ text: 'Interview — M. Sze, planning officer' },
		],
	},
	{
		label: 'Offered, undecided',
		count: 3,
		items: [{ text: 'Transit-adjacent density pilot' }],
	},
	{
		label: 'Declined',
		count: 5,
		variant: 'declined',
		items: [{ text: 'Why nobody builds anymore (opinion)' }],
	},
]

/**
 * 2(g) — The ledger opened from the composer, as a popover. The groups *are*
 * the lifecycle and their order is fixed, so the undecided pile visibly
 * shrinks as you work.
 */
export function LedgerPopoverScreen() {
	return (
		<Frame width={340}>
			<div className="flex items-center gap-2.5 border-b border-edge bg-sunk px-3.5 py-2.5">
				<h3 className="text-[0.875rem] font-semibold text-ink">Offer ledger</h3>
				<span className="text-[0.75rem] text-faint">17</span>
				<button
					type="button"
					className="ml-auto text-[0.75rem] text-faint hover:text-ink"
				>
					⌄
				</button>
			</div>
			<FrameBody className="gap-4 p-3.5">
				{groups.map((group) => (
					<section
						key={group.label}
						className={cx(
							'flex flex-col gap-1.5',
							group.variant === 'declined' && 'opacity-50',
						)}
					>
						<MetaLabel count={group.count}>{group.label}</MetaLabel>
						{group.items.map((item) => (
							<div key={item.text} className="flex items-start gap-2">
								{item.section ? (
									<Chip variant={group.variant === 'used' ? 'accent' : 'outline'}>
										{item.section}
									</Chip>
								) : null}
								<p className="min-w-0 flex-1 truncate text-[0.75rem] text-muted">
									{item.text}
								</p>
							</div>
						))}
					</section>
				))}
			</FrameBody>
		</Frame>
	)
}
