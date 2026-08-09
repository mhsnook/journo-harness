import { useCallback, useState } from 'react'

import type { Plan, ProposalInput, Refusal } from '../../shared/plan'
import { planAllocation, resolveArticleScope } from '../../shared/plan'
import { GroupHeading } from '../components/Divider'
import { EmptySlot, TextField } from '../components/Field'
import { LengthBar } from '../components/LengthBar'
import { Notice } from '../components/Notice'
import { Panel, type PanelProps } from '../components/Panel'
import { AddSection } from './AddSection'
import type { SectionAnchor } from './edits'
import { addSection, setAdjectives, setTarget, setTitle, setVoice } from './edits'
import { outlineEntries } from './outline'
import { ReferenceList } from './ReferenceList'
import { refusalText } from './refusalText'
import { SectionRow } from './SectionRow'
import { ToneFields } from './ToneFields'
import { AllocationNote, TargetField } from './WordCount'

/**
 * The Plan Panel — the surface the writer edits directly. It takes the Plan and
 * one `edit` function, so a story can drive it from local state and the app can
 * drive it from the Article Agent, which is the only writer of either.
 */

export interface PlanPanelProps {
	plan: Plan
	edit: (ops: ProposalInput | null) => void
	/** The rule between this Panel and its neighbour. */
	divider?: PanelProps['divider']
	/** Why the last edit did not land. */
	refusal?: Refusal | null
	/** What the Article Agent said when a write did not parse. */
	rejected?: string | null
	className?: string
}

export function PlanPanel({
	plan,
	edit,
	divider,
	refusal = null,
	rejected = null,
	className,
}: PlanPanelProps) {
	// One Section is open at a time. `made` is the one the writer has just
	// added, which takes the caret as it opens, and `shown` is the Reference a
	// Section row has just sent them down to.
	const [openId, setOpenId] = useState<string | null>(null)
	const [made, setMade] = useState<string | null>(null)
	const [shown, setShown] = useState<string | null>(null)

	// Held: the shown row's effect lists it, and a new function each render would
	// restart that row's scroll on every keystroke elsewhere in the Panel.
	const clearShown = useCallback(() => setShown(null), [])

	const entries = outlineEntries(plan.outline)
	const allocation = planAllocation(plan)
	const resolved = resolveArticleScope(plan)

	// The bar is the shape of the piece, drawn from the Sections that carry a
	// share of it. A Section with no target is left out rather than taking the
	// bar away: what is placed is still worth seeing.
	const segments = plan.outline
		.filter((node) => node.target !== undefined)
		.map((node) => ({ label: node.title, words: node.target ?? 0 }))

	const add = (anchor: SectionAnchor) => {
		const id = crypto.randomUUID()
		edit(addSection(anchor, id))
		setOpenId(id)
		setMade(id)
	}

	return (
		<Panel className={className} divider={divider} variant="sunk">
			{refusal === null ? null : <Notice>{refusalText(plan, refusal)}</Notice>}
			{rejected === null ? null : (
				<Notice>The Article Agent refused the write. {rejected}</Notice>
			)}

			<TextField
				hiddenLabel="Article title"
				label="Title"
				onChange={(title) => edit(setTitle(plan, null, title))}
				placeholder="Untitled article"
				value={plan.title}
			/>

			<div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
				<TargetField
					className="w-48 shrink-0"
					label="Length"
					onTarget={(target) => edit(setTarget(plan, null, target))}
					target={plan.totalTarget}
				/>
				<AllocationNote allocation={allocation} className="label-meta" />
			</div>

			<ToneFields
				adjectives={plan.adjectives}
				onAdjectives={(adjectives) => edit(setAdjectives(plan, null, adjectives))}
				onVoice={(voice) => edit(setVoice(plan, null, voice))}
				resolved={resolved}
				scopeName="the Article"
				voice={plan.voice ?? null}
			/>

			<GroupHeading count={plan.outline.length}>Outline</GroupHeading>

			{entries.length === 0 ? (
				<EmptySlot className="min-h-[3.5rem]">
					Sections appear as you agree on them in the Chat — and you can write your own
					straight in here
				</EmptySlot>
			) : (
				<div className="flex items-start gap-3.5">
					<div className="flex min-w-0 flex-1 flex-col gap-1.5">
						{entries.map((entry) => (
							<SectionRow
								key={entry.node.id}
								edit={edit}
								entry={entry}
								onOpen={setOpenId}
								onShowReference={setShown}
								open={entry.node.id === openId}
								plan={plan}
								takeCaret={entry.node.id === made}
							/>
						))}
					</div>
					{segments.length > 0 ? (
						<LengthBar segments={segments} height={Math.max(120, entries.length * 44)} />
					) : null}
				</div>
			)}

			<div className="flex">
				<AddSection onAdd={add} outline={plan.outline} />
			</div>

			<GroupHeading count={plan.references.length}>References</GroupHeading>
			<ReferenceList
				className="flex flex-col items-stretch gap-1.5"
				edit={edit}
				entries={entries}
				onShown={clearShown}
				plan={plan}
				shown={shown}
			/>
		</Panel>
	)
}
