import { useEffect, useRef, useState } from 'react'

import type { Plan, ProposalInput } from '../../shared/plan'
import { nodeAllocation, resolveNodeScope } from '../../shared/plan'
import { Button } from '../components/Button'
import { InlineInput, TextField } from '../components/Field'
import { OutlineRow } from '../components/OutlineRow'
import { cx } from '../lib/cx'
import {
	deleteSection,
	moveSection,
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
 * One Section of the Outline, closed until the writer opens it. Closed, it is
 * the row they read: the number, the title, the target, and the Tone. Open, it
 * is every field they edit. One Section is open at a time, so the Panel stays a
 * list rather than a wall of inputs.
 *
 * The row keeps its id through every operation here — a reorder anchors on the
 * neighbour it swaps with, and nothing regenerates an id.
 *
 * **Subsections are TBD.** The Plan carries them and this row renders one, but
 * the Panel offers no control that makes, nests, or lifts one. The Outline is
 * flat until the flat one is smooth.
 */

export interface SectionRowProps {
	entry: OutlineEntry
	plan: Plan
	edit: (ops: ProposalInput | null) => void
	/** True when this is the Section the writer has open. */
	open: boolean
	/** Open this Section, or close it with null. */
	onOpen: (nodeId: string | null) => void
	/** Take the caret, because the writer just made this Section. */
	takeCaret?: boolean
	className?: string
}

export function SectionRow({
	entry,
	plan,
	edit,
	open,
	onOpen,
	takeCaret = false,
	className,
}: SectionRowProps) {
	const [armed, setArmed] = useState(false)
	const { node, depth, index, ordinal, siblings } = entry

	const name = depthName(depth)
	const scopeName = `${name} ${ordinal}`
	const title = useRef<HTMLInputElement>(null)
	const row = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!open || !takeCaret) return

		row.current?.scrollIntoView({ block: 'nearest' })
		title.current?.focus()
	}, [open, takeCaret])

	if (!open) {
		return (
			<button
				className={cx(
					'-mx-1.5 rounded-md px-1.5 py-1 text-left hover:bg-hush',
					className,
				)}
				onClick={() => onOpen(node.id)}
				style={{ marginLeft: depth * 20 }}
				type="button"
			>
				<OutlineRow node={node} ordinal={ordinal} />
				{node.intent ? (
					<p className="mt-1 truncate pl-[1.375rem] text-[0.75rem] text-muted">
						{node.intent}
					</p>
				) : null}
			</button>
		)
	}

	const resolved = resolveNodeScope(plan, node.id) ?? { voice: null, adjectives: [] }
	const allocation = nodeAllocation(node)

	return (
		<div
			ref={row}
			className={cx(
				'flex items-start gap-2.5 rounded-md border border-edge bg-surface p-2.5',
				className,
			)}
			style={{ marginLeft: depth * 20 }}
		>
			<span className="mt-1.5 w-3 shrink-0 font-mono text-[0.6875rem] text-faint">
				{ordinal}
			</span>

			<div className="flex min-w-0 flex-1 flex-col gap-2">
				<div className="flex items-center gap-2.5">
					<InlineInput
						ref={title}
						className="min-w-0 flex-1 text-[0.8125rem] leading-snug font-medium"
						label={`Title of ${scopeName}`}
						onChange={(typed) => edit(setTitle(plan, node.id, typed))}
						placeholder={`Untitled ${name.toLowerCase()}`}
						value={node.title}
					/>
					<TargetField
						className="w-28 shrink-0"
						hiddenLabel={`Word-count target for ${scopeName}`}
						onTarget={(target) => edit(setTarget(plan, node.id, target))}
						placeholder="—"
						target={node.target ?? null}
					/>
				</div>

				{node.children.length > 0 ? (
					<AllocationNote
						allocation={allocation}
						className="text-[0.6875rem] text-faint"
						parts="the Subsections"
					/>
				) : null}

				<TextField
					hiddenLabel={`Intent note for ${scopeName}`}
					onChange={(intent) =>
						edit(setIntent(plan, node.id, intent === '' ? null : intent))
					}
					placeholder="What this Section does"
					rows={2}
					value={node.intent ?? ''}
				/>

				<ToneFields
					adjectives={node.adjectives ?? []}
					onAdjectives={(adjectives) => edit(setAdjectives(plan, node.id, adjectives))}
					onVoice={(voice) => edit(setVoice(plan, node.id, voice))}
					resolved={resolved}
					scopeName={scopeName}
					voice={node.voice ?? null}
				/>

				<div className="flex items-center gap-1.5 pt-0.5">
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
					<Button
						onBlur={() => setArmed(false)}
						onClick={() => {
							// Two clicks, because there is no undo. Leaving the button disarms
							// it.
							if (armed) edit(deleteSection(node.id))
							else setArmed(true)
						}}
						size="sm"
						variant="quiet"
					>
						{armed ? `delete ${name.toLowerCase()}?` : 'delete'}
					</Button>
					<Button
						className="ml-auto"
						onClick={() => onOpen(null)}
						size="sm"
						variant="quiet"
					>
						done
					</Button>
				</div>
			</div>
		</div>
	)
}
