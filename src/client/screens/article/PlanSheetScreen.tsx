import { ArticleBar } from '../../components/ArticleBar'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { Divider } from '../../components/Divider'
import { Frame, FrameBody } from '../../components/Frame'
import { LengthBar } from '../../components/LengthBar'
import { Panel, PanelHeader } from '../../components/Panel'
import { plan, sectionState } from '../../mock/content'
import { outlineEntries, sectionLabel } from '../../plan/outline'
import { PlanOutline, PlanReferences } from './PlanBlocks'

/** What each Section is called on the References list. Off the same walk the
 * Panels read, so the showcase cannot number a Section its own way. */
const placedAt = Object.fromEntries(
	outlineEntries(plan.outline).map((entry) => [entry.node.id, sectionLabel(entry)]),
)

/**
 * 2(e) — The Plan on its own, full width. The Outline and the References are
 * stacked rather than columned: within a status the eye should only travel
 * down. The bar beside the Outline is the shape of the piece — each Section's
 * height is its share of the 2,400 words.
 */
export function PlanSheetScreen() {
	return (
		<Frame width={680}>
			<ArticleBar title={plan.title} open={['plan']} status="draft 1" />
			<FrameBody>
				<Panel className="gap-5 p-5">
					<section className="flex flex-col gap-3">
						<PanelHeader
							title="Outline"
							meta="2,400 words target"
							actions={<Chip variant="outline">voice: {plan.voice}</Chip>}
						/>
						<div className="flex items-start gap-5">
							<PlanOutline outline={plan.outline} className="flex-1" />
							<LengthBar
								segments={plan.outline.map((node) => ({
									label: node.title,
									words: node.target ?? 0,
									state: sectionState[node.id],
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
						<PanelHeader title="References" meta="4 · 3 placed" />
						<PlanReferences references={plan.references} placedAt={placedAt} />
						<p className="text-[0.6875rem] text-faint">
							Every Reference is a Link or a Quote, so one list holds both — drag one onto
							a Section to place it.
						</p>
					</section>

					<div className="flex items-center gap-3 pt-1">
						<Button variant="accent">start writing →</Button>
					</div>
				</Panel>
			</FrameBody>
		</Frame>
	)
}
