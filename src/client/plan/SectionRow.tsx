import { useEffect, useRef, useState } from 'react'

import type { Plan, ProposalInput } from '../../shared/plan'
import { nodeAllocation, resolveNodeScope } from '../../shared/plan'
import { Button } from '../components/Button'
import { FieldRow, InlineInput, TextField } from '../components/Field'
import { OutlineRow } from '../components/OutlineRow'
import { cx } from '../lib/cx'
import {
	deleteSection,
	moveSection,
	placeReference,
	setAdjectives,
	setIntent,
	setTarget,
	setTitle,
	setVoice,
} from './edits'
import type { OutlineEntry } from './outline'
import { depthName, outlineEntries, sectionLabel } from './outline'
import type { ReferenceEntry } from './references'
import {
	referenceEntries,
	referenceMark,
	referenceName,
	referencesAt,
} from './references'
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
 * no control in the app makes, nests, or lifts one — every anchor on offer sits
 * at the top level. The Outline is flat until the flat one is smooth.
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
	/** Show a Reference placed here, down in the References list. */
	onShowReference: (referenceId: string) => void
	className?: string
}

export function SectionRow({
	entry,
	plan,
	edit,
	open,
	onOpen,
	takeCaret = false,
	onShowReference,
	className,
}: SectionRowProps) {
	const [armed, setArmed] = useState(false)
	const { node, depth, index, ordinal, siblings } = entry

	const name = depthName(depth)
	const scopeName = `${name} ${ordinal}`
	const title = useRef<HTMLInputElement>(null)
	const row = useRef<HTMLDivElement>(null)

	const placed = referencesAt(plan, node.id)
	// What the picker could offer: a Reference sits at one Section, so anything
	// not already here can be moved here. With none, the row has nothing to say.
	const offerable = referenceEntries(plan).filter(
		(entry) => entry.reference.nodeId !== node.id,
	)

	// Opening a Section puts the caret in its title. Without it the focus stays
	// on the closed row's button, which this row has just replaced — so it falls
	// to the page, and Escape has nothing to close.
	useEffect(() => {
		if (!open) return

		title.current?.focus()
		if (takeCaret) row.current?.scrollIntoView({ block: 'nearest' })
	}, [open, takeCaret])

	/** Enter is done. Nothing is lost by leaving — the Section reopens on a
	 * click, and the write has already gone. */
	const doneOnEnter = (event: { key: string; preventDefault: () => void }) => {
		if (event.key !== 'Enter') return
		event.preventDefault()
		onOpen(null)
	}

	const placedList =
		placed.length === 0 ? null : (
			<div className="flex flex-col gap-0.5">
				{placed.map((held) => (
					<button
						key={held.reference.id}
						className="flex items-baseline gap-1.5 truncate text-left text-[0.6875rem] text-muted hover:text-ink"
						onClick={() => onShowReference(held.reference.id)}
						type="button"
					>
						<span className="label-meta shrink-0">{referenceMark(held)}</span>
						<span className="truncate">{referenceName(held.reference)}</span>
					</button>
				))}
			</div>
		)

	if (!open) {
		return (
			<div
				className={cx('flex flex-col gap-1', className)}
				style={{ marginLeft: depth * 20 }}
			>
				<button
					className="-mx-1.5 rounded-md border border-transparent px-1.5 py-1 text-left hover:border-edge hover:bg-surface"
					onClick={() => onOpen(node.id)}
					// Opening on mousedown, because the Section that is open closes on
					// the focus leaving it — which relays out the list and moves this
					// row out from under the pointer before the click lands.
					onMouseDown={(event) => {
						event.preventDefault()
						onOpen(node.id)
					}}
					type="button"
				>
					<OutlineRow node={node} ordinal={ordinal} />
					{node.intent ? (
						<p className="mt-1 truncate pl-[1.375rem] text-[0.75rem] text-muted">
							{node.intent}
						</p>
					) : null}
				</button>
				{placedList === null ? null : <div className="pl-[1.375rem]">{placedList}</div>}
			</div>
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
			onBlur={(event) => {
				// Reaching for another field closes this Section. A blur with nowhere
				// to go — clicking the page, or the row being moved in the list — is
				// not the writer leaving, so it does not close anything.
				const to = event.relatedTarget
				if (to !== null && !event.currentTarget.contains(to)) onOpen(null)
			}}
			onKeyDown={(event) => {
				if (event.key !== 'Escape') return
				event.stopPropagation()
				onOpen(null)
			}}
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
						onKeyDown={doneOnEnter}
						placeholder={`Untitled ${name.toLowerCase()}`}
						value={node.title}
					/>
					<TargetField
						className="w-28 shrink-0"
						hiddenLabel={`Word-count target for ${scopeName}`}
						onKeyDown={doneOnEnter}
						onTarget={(target) => edit(setTarget(plan, node.id, target))}
						placeholder="—"
						target={node.target ?? null}
					/>
				</div>

				{node.children.length > 0 ? (
					<AllocationNote
						allocation={allocation}
						className="text-[0.6875rem] text-faint"
						parts="Subsections"
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

				{/* Voice, Adjectives, and References are one run of minor fields, so
				    they sit in one column at one rhythm rather than as a block and a
				    stray row beneath it. */}
				<div className="flex flex-col gap-1.5">
					<ToneFields
						adjectives={node.adjectives ?? []}
						onAdjectives={(adjectives) => edit(setAdjectives(plan, node.id, adjectives))}
						onVoice={(voice) => edit(setVoice(plan, node.id, voice))}
						resolved={resolved}
						scopeName={scopeName}
						voice={node.voice ?? null}
					/>

					{placedList === null && offerable.length === 0 ? null : (
						<FieldRow className="items-start" label="References">
							{/* Stretched, not `items-start`: a placed Reference has to be
							    allowed to shrink before `truncate` will cut it. */}
							<div className="flex flex-col gap-0.5">
								{placedList}
								<PlaceReference
									edit={edit}
									nodeId={node.id}
									offerable={offerable}
									plan={plan}
									scopeName={scopeName}
								/>
							</div>
						</FieldRow>
					)}
				</div>

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

interface PlaceReferenceProps {
	plan: Plan
	nodeId: string
	/** Every Reference not already here, worked out by the row. */
	offerable: ReferenceEntry[]
	edit: (ops: ProposalInput | null) => void
	/** "Section 2", for the control's name. */
	scopeName: string
}

/**
 * Placing a Reference from the Section's side, as a picker of what to put here.
 * `ReferenceList` places one from the Reference's side, with a `<select>` of
 * Sections on each row; both build the same `placeReference` op, and both are
 * that same control turned round, so neither reads as a different kind of act.
 *
 * A Reference sits at one Section, so picking one placed elsewhere moves it.
 */
function PlaceReference({
	plan,
	nodeId,
	offerable,
	edit,
	scopeName,
}: PlaceReferenceProps) {
	// Nothing to offer: every Reference the Plan holds already sits here.
	if (offerable.length === 0) return null

	const placed = new Map(
		outlineEntries(plan.outline).map((entry) => [entry.node.id, sectionLabel(entry)]),
	)

	return (
		// Styled as `InlineInput` is, so it reads as the same kind of control as
		// the Adjective field beside it: faint until the writer reaches for it.
		<select
			aria-label={`Place a Reference at ${scopeName}`}
			className="min-w-0 appearance-none self-start rounded-sm border-b border-transparent bg-transparent text-[0.6875rem] text-faint outline-none hover:border-edge focus:border-edge"
			onChange={(event) => edit(placeReference(plan, event.target.value, nodeId))}
			value=""
		>
			<option value="">+ reference</option>
			{offerable.map((entry) => (
				<option key={entry.reference.id} value={entry.reference.id}>
					{referenceMark(entry)} {referenceName(entry.reference)}
					{entry.reference.nodeId === null
						? ''
						: ` — now at ${placed.get(entry.reference.nodeId) ?? '—'}`}
				</option>
			))}
		</select>
	)
}
