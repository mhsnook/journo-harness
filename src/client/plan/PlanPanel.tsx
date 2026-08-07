import type { Plan, ProposalInput, Refusal } from '../../shared/plan'
import { planAllocation, resolveArticleScope } from '../../shared/plan'
import { Button } from '../components/Button'
import { GroupHeading } from '../components/Divider'
import { EmptySlot, TextField } from '../components/Field'
import { LengthBar } from '../components/LengthBar'
import { Panel } from '../components/Panel'
import { addSection, setAdjectives, setTarget, setTitle, setVoice } from './edits'
import { outlineEntries } from './outline'
import { ReferenceList } from './ReferenceList'
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
	/** Why the last edit did not land. */
	refusal?: Refusal | null
	/** What the Article Agent said when a write did not parse. */
	rejected?: string | null
	className?: string
}

export function PlanPanel({
	plan,
	edit,
	refusal = null,
	rejected = null,
	className,
}: PlanPanelProps) {
	const entries = outlineEntries(plan.outline)
	const allocation = planAllocation(plan)
	const resolved = resolveArticleScope(plan)

	// The bar is the shape of the piece, so it only draws once every Section
	// carries a share of it. Until then the gap is the thing to read.
	const targeted = plan.outline.every((node) => node.target !== undefined)

	return (
		<Panel className={className} variant="sunk">
			{refusal === null ? null : (
				<p className="rounded-md border border-accent-edge bg-accent-soft p-2 text-[0.75rem] text-accent-ink">
					{refusal.message}
				</p>
			)}
			{rejected === null ? null : (
				<p className="rounded-md border border-accent-edge bg-accent-soft p-2 text-[0.75rem] text-accent-ink">
					The Article Agent refused the write. {rejected}
				</p>
			)}

			<TextField
				hiddenLabel="Article title"
				label="Title"
				onChange={(title) => edit(setTitle(plan, null, title))}
				placeholder="Untitled article"
				value={plan.title}
			/>

			<div className="flex flex-wrap items-center gap-2.5">
				<TargetField
					className="w-44"
					label="Length"
					onTarget={(target) => edit(setTarget(plan, null, target))}
					target={plan.totalTarget}
				/>
				<AllocationNote allocation={allocation} className="text-[0.6875rem] text-faint" />
			</div>

			<ToneFields
				adjectives={plan.adjectives}
				onAdjectives={(adjectives) => edit(setAdjectives(plan, null, adjectives))}
				onVoice={(voice) => edit(setVoice(plan, null, voice))}
				resolved={resolved}
				scopeName="the Article"
				voice={plan.voice ?? null}
			/>

			<GroupHeading
				action={
					<Button
						onClick={() => edit(addSection({ parentId: null, beforeId: null }))}
						size="sm"
						variant="quiet"
					>
						+ section
					</Button>
				}
				count={plan.outline.length}
			>
				Outline
			</GroupHeading>

			{entries.length === 0 ? (
				<EmptySlot className="min-h-[3.5rem]">
					Sections appear as you agree on them in the Chat — and you can write your own
					straight in here
				</EmptySlot>
			) : (
				<div className="flex items-start gap-3.5">
					<div className="flex min-w-0 flex-1 flex-col gap-3.5">
						{entries.map((entry) => (
							<SectionRow key={entry.node.id} edit={edit} entry={entry} plan={plan} />
						))}
					</div>
					{targeted ? (
						<LengthBar
							segments={plan.outline.map((node) => ({
								label: node.title,
								words: node.target ?? 0,
							}))}
							height={Math.max(120, entries.length * 96)}
						/>
					) : null}
				</div>
			)}

			<GroupHeading count={plan.references.length}>References</GroupHeading>
			<ReferenceList
				className="flex flex-col gap-1.5"
				edit={edit}
				entries={entries}
				plan={plan}
			/>
		</Panel>
	)
}
