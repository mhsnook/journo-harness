import { ArticleBar } from '../../../src/client/components/ArticleBar'
import { Chip } from '../../../src/client/components/Chip'
import { Frame, FrameBody } from '../../../src/client/components/Frame'
import { Panel, PanelHeader } from '../../../src/client/components/Panel'
import { PlanMap } from '../../../src/client/plan/PlanMap'
import type { OutlineNode, Plan } from '../../../src/shared/plan'
import { plan } from '../../mock/content'

/**
 * 2(k) — The Plan Panel's Map View. The same Outline the Panel lists, opened
 * left to right from the Article title.
 *
 * The mock Plan is flat, and a map of a flat list is a comb. Two Sections are
 * given Subsections here so the screen shows what the View is for: where the
 * piece branches, and how deep it goes.
 */

function nest(id: string, children: OutlineNode[]): (node: OutlineNode) => OutlineNode {
	return (node) => (node.id === id ? { ...node, children } : node)
}

const mapped: Plan = {
	...plan,
	outline: plan.outline
		.map(
			nest('sec-review', [
				{
					id: 'sec-review-points',
					title: 'The eleven points',
					target: 400,
					children: [],
				},
				{
					id: 'sec-review-clock',
					title: 'One objection resets the clock',
					intent: 'The Hartley case, start to finish.',
					target: 300,
					children: [],
				},
			]),
		)
		.map(
			nest('sec-cost', [
				{
					id: 'sec-cost-record',
					title: 'The ones who would not go on record',
					target: 500,
					children: [],
				},
				{
					id: 'sec-cost-rent',
					title: 'What the delay costs in rent',
					target: 400,
					children: [],
				},
			]),
		),
}

export function PlanMapScreen() {
	return (
		<Frame width={860}>
			<ArticleBar title={plan.title} open={['plan']} status="draft 1" />
			<FrameBody className="h-[26rem]">
				<Panel className="gap-3.5" variant="sunk">
					<PanelHeader
						title="Outline"
						meta="map"
						actions={<Chip variant="outline">2,400 words target</Chip>}
					/>
					<PlanMap plan={mapped} />
					<p className="text-[0.6875rem] text-faint">
						Hover a Section to light its path back to the title. The control on a box
						folds what sits inside it — on this map only, and never in the Plan.
					</p>
				</Panel>
			</FrameBody>
		</Frame>
	)
}
