import { useState } from 'react'

import type { Plan, ProposalInput } from '../../shared/plan'
import { nodeAllocation, resolveNodeScope } from '../../shared/plan'
import { Button } from '../components/Button'
import { InlineInput, TextField } from '../components/Field'
import {
	addSection,
	deleteSection,
	liftSection,
	moveSection,
	nestSection,
	setAdjectives,
	setIntent,
	setTarget,
	setTitle,
	setVoice,
} from './edits'
import type { OutlineEntry } from './outline'
import { depthName } from './outline'
import { ToneFields } from './ToneFields'
import { AllocationNote, TargetField } from './WordCount'

/**
 * One Section of the Outline, with every field the writer edits directly. The
 * row keeps its id through every operation here — a reorder anchors on the
 * neighbour it swaps with, and nothing regenerates an id.
 */

export interface SectionRowProps {
	entry: OutlineEntry
	plan: Plan
	edit: (ops: ProposalInput | null) => void
	className?: string
}

export function SectionRow({ entry, plan, edit, className }: SectionRowProps) {
	const [armed, setArmed] = useState(false)
	const { node, depth, index, ordinal, siblings } = entry

	const name = depthName(depth)
	const scopeName = `${name} ${ordinal}`
	const resolved = resolveNodeScope(plan, node.id) ?? { voice: null, adjectives: [] }
	const allocation = nodeAllocation(node)

	const nest = nestSection(plan, node.id)
	const lift = liftSection(plan, node.id)

	return (
		<div
			className={className}
			style={{ paddingLeft: depth * 20 }}
			data-section-id={node.id}
		>
			<div className="flex items-start gap-2.5">
				<span className="mt-1 w-6 shrink-0 font-mono text-[0.6875rem] text-faint">
					{ordinal}
				</span>

				<div className="flex min-w-0 flex-1 flex-col gap-1.5">
					<InlineInput
						className="w-full text-[0.8125rem] leading-snug font-medium"
						label={`Title of ${scopeName}`}
						onChange={(title) => edit(setTitle(plan, node.id, title))}
						placeholder={`Untitled ${name.toLowerCase()}`}
						value={node.title}
					/>

					<TextField
						hiddenLabel={`Intent note for ${scopeName}`}
						onChange={(intent) =>
							edit(setIntent(plan, node.id, intent === '' ? null : intent))
						}
						placeholder="What this Section does"
						rows={2}
						value={node.intent ?? ''}
					/>

					<div className="flex flex-wrap items-center gap-2.5">
						<TargetField
							className="w-36"
							hiddenLabel={`Word-count target for ${scopeName}`}
							onTarget={(target) => edit(setTarget(plan, node.id, target))}
							target={node.target ?? null}
						/>
						{node.children.length > 0 ? (
							<AllocationNote
								allocation={allocation}
								className="text-[0.6875rem] text-faint"
								parts="the Subsections"
							/>
						) : null}
					</div>

					<ToneFields
						adjectives={node.adjectives ?? []}
						onAdjectives={(adjectives) => edit(setAdjectives(plan, node.id, adjectives))}
						onVoice={(voice) => edit(setVoice(plan, node.id, voice))}
						resolved={resolved}
						scopeName={scopeName}
						voice={node.voice ?? null}
					/>

					<div className="flex flex-wrap items-center gap-1.5 pt-0.5">
						<Button
							aria-label={`Move ${scopeName} up`}
							disabled={index === 0}
							onClick={() => edit(moveSection(plan, node.id, 'up'))}
							size="sm"
							variant="quiet"
						>
							↑
						</Button>
						<Button
							aria-label={`Move ${scopeName} down`}
							disabled={index === siblings.length - 1}
							onClick={() => edit(moveSection(plan, node.id, 'down'))}
							size="sm"
							variant="quiet"
						>
							↓
						</Button>
						{nest !== null ? (
							<Button
								onClick={() => edit(nest)}
								size="sm"
								title={`Make ${scopeName} a Subsection of the Section above it`}
								variant="quiet"
							>
								→ subsection
							</Button>
						) : null}
						{lift !== null ? (
							<Button
								onClick={() => edit(lift)}
								size="sm"
								title={`Make ${scopeName} a Section of its own`}
								variant="quiet"
							>
								← section
							</Button>
						) : null}
						{depth === 0 ? (
							<Button
								onClick={() => edit(addSection({ parentId: node.id, beforeId: null }))}
								size="sm"
								variant="quiet"
							>
								+ subsection
							</Button>
						) : null}
						<Button
							className="ml-auto"
							onBlur={() => setArmed(false)}
							onClick={() => {
								// Two clicks, because there is no undo and a delete takes the
								// Subsections with it. Leaving the button disarms it.
								if (armed) edit(deleteSection(node.id))
								else setArmed(true)
							}}
							size="sm"
							variant="quiet"
						>
							{armed ? `delete ${name.toLowerCase()}?` : 'delete'}
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}
