import { ArticleBar } from '../../components/ArticleBar'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { Divider } from '../../components/Divider'
import { Frame, FrameBody } from '../../components/Frame'
import { LengthBar } from '../../components/LengthBar'
import { Panel, PanelHeader } from '../../components/Panel'
import { QuoteRow } from '../../components/QuoteRow'
import { ARTICLE_TITLE, outline, quotes, references } from '../../mock/content'
import { PlanOutline } from './PlanBlocks'

/**
 * 2(e) — The plan on its own, full width. Outline, references and quotes are
 * stacked rather than columned: within a status the eye should only travel
 * down. The bar beside the outline is the shape of the piece — each section's
 * height is its share of the 2,400 words.
 */
export function PlanSheetScreen() {
	return (
		<Frame width={680}>
			<ArticleBar title={ARTICLE_TITLE} open={['plan']} status="draft 1" />
			<FrameBody>
				<Panel className="gap-5 p-5">
					<section className="flex flex-col gap-3">
						<PanelHeader
							title="Outline"
							meta="2,400 words target"
							actions={<Chip variant="outline">voice: Reported feature</Chip>}
						/>
						<div className="flex items-start gap-5">
							<PlanOutline sections={outline} className="flex-1" />
							<LengthBar
								segments={outline.map((section) => ({
									label: section.title,
									words: section.words,
									state: section.state,
								}))}
								height={188}
							/>
						</div>
						<p className="text-[0.6875rem] text-faint">
							Edit it by hand, or go back to the chat and argue about it — either way the
							advice you get while drafting changes to match.
						</p>
					</section>

					<Divider weight="strong" />

					<section className="flex flex-col gap-3">
						<PanelHeader title="References" meta="12 · 9 kept" />
						<div className="grid grid-cols-3 gap-2.5">
							{[references[0], references[1], references[3]].map((reference) => (
								<div
									key={reference.id}
									className="flex flex-col gap-1 rounded-md border border-edge bg-sunk p-2.5"
								>
									<p className="text-[0.75rem] leading-snug font-medium text-ink">
										{reference.title}
									</p>
									<p className="text-[0.6875rem] text-faint">
										{[reference.outlet, reference.year].filter(Boolean).join(' · ')}
									</p>
									<p className="mt-auto pt-1 text-[0.6875rem] text-muted">
										{reference.section ?? 'unassigned'}
									</p>
								</div>
							))}
						</div>
					</section>

					<Divider weight="strong" />

					<section className="flex flex-col gap-3">
						<PanelHeader title="Quotes" meta="8 saved" />
						<div className="flex flex-col gap-3">
							{quotes.map((quote) => (
								<QuoteRow key={quote.id} quote={quote} />
							))}
							<p className="text-[0.6875rem] text-faint">
								+ 5 more · drag a quote onto a section to place it
							</p>
						</div>
					</section>

					<div className="flex items-center gap-3 pt-1">
						<Button variant="accent">start writing →</Button>
					</div>
				</Panel>
			</FrameBody>
		</Frame>
	)
}
