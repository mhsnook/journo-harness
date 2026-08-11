import { useState } from 'react'

import { ArticleBar } from '../../../src/client/components/ArticleBar'
import { Chip } from '../../../src/client/components/Chip'
import { Frame, FrameBody } from '../../../src/client/components/Frame'
import { Panel, PanelHeader } from '../../../src/client/components/Panel'
import { cx } from '../../../src/client/lib/cx'
import { PlanMap } from '../../../src/client/plan/PlanMap'
import type { OutlineNode, Plan, ProposalInput } from '../../../src/shared/plan'
import { applyProposal } from '../../../src/shared/plan'
import { plan } from '../../mock/content'
import { PlanOutline } from './PlanBlocks'

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

const VIEWS = ['list', 'map'] as const
type View = (typeof VIEWS)[number]

/**
 * The switch between the Plan Panel's two Views, built like the Panel rail in
 * the bar above it: the one you are in is solid ink, and neither is accented,
 * because which View you are in is state rather than a decision the screen
 * wants from you — `foundations/Accent.mdx`.
 *
 * It sits here rather than in `src/client/plan/` because the Map View is not
 * wired into the app yet. Wiring it means giving `PlanPanel` a header row to
 * hold this, which it has none of today.
 */
function ViewRail({ view, onView }: { view: View; onView: (view: View) => void }) {
	return (
		<div
			aria-label="How the Outline is shown"
			className="flex shrink-0 items-center gap-0.5 rounded-full border border-edge bg-sunk p-0.5"
			role="group"
		>
			{VIEWS.map((one) => (
				<button
					key={one}
					aria-pressed={one === view}
					className={cx(
						'rounded-full px-2.5 py-1 text-[0.6875rem] leading-none font-medium transition-colors',
						one === view
							? 'bg-ink text-paper'
							: 'text-faint hover:bg-hush hover:text-muted',
					)}
					onClick={() => onView(one)}
					type="button"
				>
					{one}
				</button>
			))}
		</div>
	)
}

export function PlanMapScreen() {
	const [view, setView] = useState<View>('map')
	// The applier behind the map, the way `EditablePlan` puts it behind the
	// Panel: every edit runs the ops the app runs, so a refusal shows up here the
	// way the writer would meet it.
	const [edited, setEdited] = useState<Plan>(mapped)

	const edit = (ops: ProposalInput | null) => {
		if (ops === null) return

		const result = applyProposal(edited, ops)
		if (result.ok) setEdited(result.plan)
	}

	return (
		<Frame width={860}>
			<ArticleBar title={plan.title} open={['plan']} status="draft 1" />
			{/* Taller than the other Plan screens: the map is wider than a list and
			    an open Section's fields run below the box they open from. */}
			<FrameBody className="h-[32rem]">
				<Panel className="gap-3.5" variant="sunk">
					<PanelHeader
						title="Outline"
						actions={
							<>
								<Chip variant="outline">2,400 words target</Chip>
								<ViewRail onView={setView} view={view} />
							</>
						}
					/>

					{view === 'map' ? (
						<PlanMap edit={edit} plan={edited} />
					) : (
						<PlanOutline className="max-w-md" outline={edited.outline} />
					)}

					<p className="text-[0.6875rem] text-faint">
						{view === 'map'
							? 'Click a Section to open its fields over the map. Hover one to light its path back to the title, and use the control on a box to fold what sits inside it — on this map only, and never in the Plan.'
							: 'The same Outline, listed. Both Views read one Plan, so neither can show a Section the other does not.'}
					</p>
				</Panel>
			</FrameBody>
		</Frame>
	)
}
