import { ArticleBar } from '../../components/ArticleBar'
import { Chip } from '../../components/Chip'
import { EmptySlot } from '../../components/Field'
import { Frame, FrameBody } from '../../components/Frame'
import { MetaLabel } from '../../components/MetaLabel'
import { Pane } from '../../components/Pane'
import { QuoteRow } from '../../components/QuoteRow'
import { SourceCard } from '../../components/SourceCard'
import { ARTICLE_TITLE, quotes, sources } from '../../mock/content'

/**
 * 2(f) — The ledger, as two equal halves. Left is what has been offered and
 * nothing else; right is the plan, with accepted items sitting under the
 * section they belong to and marked used or ready.
 *
 * It is the same list at every stage — early on most rows read "offered",
 * later most read "used". That is why there is no separate triage screen.
 */
export function LedgerDrawerScreen() {
	return (
		<Frame width={820}>
			<ArticleBar title={ARTICLE_TITLE} open={['chat', 'plan']} status="ledger" />
			<FrameBody row className="min-h-[22rem]">
				<Pane divider="right" padded={false}>
					<header className="flex items-center gap-2.5 border-b border-edge bg-sunk px-3.5 py-2.5">
						<h3 className="text-[0.875rem] font-semibold text-ink">Offered</h3>
						<span className="text-[0.75rem] text-faint">17 · 9 accepted</span>
						<button
							type="button"
							className="ml-auto text-[0.75rem] text-faint hover:text-ink"
						>
							close ×
						</button>
					</header>
					<div className="flex flex-col gap-2.5 p-3.5">
						<div className="flex flex-wrap gap-1.5">
							<Chip tone="solid" interactive>
								all
							</Chip>
							<Chip tone="outline" interactive>
								undecided
							</Chip>
							<Chip tone="outline" interactive>
								accepted
							</Chip>
							<Chip tone="outline" interactive>
								cut
							</Chip>
						</div>
						<SourceCard source={sources[0]} variant="ledger" compact />
						<SourceCard source={sources[1]} variant="ledger" compact />
						<SourceCard source={sources[2]} variant="ledger" compact />
						<SourceCard source={sources[4]} variant="ledger" compact />
						<p className="text-[0.6875rem] text-faint">
							+ 13 more · accepting one sends it across →
						</p>
					</div>
				</Pane>

				<Pane tone="sunk" padded={false}>
					<header className="flex items-center gap-2.5 border-b border-edge px-3.5 py-2.5">
						<h3 className="text-[0.875rem] font-semibold text-ink">In the plan</h3>
						<span className="text-[0.75rem] text-faint">9 accepted · 3 used</span>
					</header>
					<div className="flex flex-col gap-4 p-3.5">
						<div className="flex flex-col gap-2">
							<MetaLabel>§2 · How review became the process</MetaLabel>
							<div className="flex flex-col gap-2.5 pl-2">
								<QuoteRow quote={quotes[0]} showUsage />
							</div>
						</div>

						<div className="flex flex-col gap-2">
							<MetaLabel count="1 unused">§3 · Who actually pays for the delay</MetaLabel>
							<div className="flex flex-col gap-2.5 pl-2">
								<QuoteRow quote={quotes[1]} showUsage />
							</div>
						</div>

						<div className="flex flex-col gap-2">
							<MetaLabel>§4 · What a faster city would look like</MetaLabel>
							<EmptySlot className="ml-2">Drop an accepted source here</EmptySlot>
						</div>

						<div className="flex flex-col gap-1.5">
							<MetaLabel count={4}>Accepted, no section yet</MetaLabel>
							<p className="text-[0.75rem] text-muted">
								Housing starts, quarterly series · The cost of discretionary review · two
								more
							</p>
						</div>
					</div>
				</Pane>
			</FrameBody>
		</Frame>
	)
}
