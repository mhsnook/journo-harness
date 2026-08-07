import { useEffect, useRef, useState } from 'react'

import type { Plan, ProposalInput } from '../../shared/plan'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { EmptySlot } from '../components/Field'
import { cx } from '../lib/cx'
import { addReference, deleteReference, placeReference, setReference } from './edits'
import type { OutlineEntry } from './outline'
import { ReferenceForm } from './ReferenceForm'
import type { ReferenceEntry } from './references'
import { referenceEntries, referenceMark, referenceName } from './references'

/**
 * The Plan's References: what the Chat turned up and the writer Accepted, and
 * what the writer pasted in themselves. Each is placed at a Section or nowhere
 * yet — References are flat and carry an optional `nodeId`, so placing one is a
 * field on the Reference rather than a move in the Outline — architecture §4.
 *
 * The type is read off the record and never derived from whether a text is
 * present: a Reference may carry a passage without being a Quote, and the two
 * Panels have to label one entry the same way.
 */

export interface ReferenceListProps {
	plan: Plan
	entries: OutlineEntry[]
	edit: (ops: ProposalInput | null) => void
	/** A Reference a Section row has sent the writer down to. It scrolls into
	 * view and takes the accent for a moment, which is the whole of the answer
	 * to "which one did I mean?" */
	shown?: string | null
	/** Said once the Reference has been shown, so the next click on the same one
	 * shows it again. */
	onShown?: () => void
	className?: string
}

export function ReferenceList({
	plan,
	entries,
	edit,
	shown = null,
	onShown,
	className,
}: ReferenceListProps) {
	// One Reference is open at a time, and `adding` is the blank form.
	const [openId, setOpenId] = useState<string | null>(null)
	const [adding, setAdding] = useState(false)

	return (
		<div className={className}>
			{plan.references.length === 0 && !adding ? (
				<EmptySlot>
					References arrive from the Chat, and land here once you Accept them — or paste
					your own
				</EmptySlot>
			) : null}

			{referenceEntries(plan).map(({ reference, number }) =>
				reference.id === openId ? (
					<ReferenceForm
						key={reference.id}
						onCancel={() => setOpenId(null)}
						onDelete={() => {
							setOpenId(null)
							edit(deleteReference(reference.id))
						}}
						onSave={(content) => {
							setOpenId(null)
							edit(setReference(plan, reference.id, content))
						}}
						reference={reference}
					/>
				) : (
					<ReferenceRow
						key={reference.id}
						entry={{ reference, number }}
						entries={entries}
						onOpen={() => setOpenId(reference.id)}
						onPlace={(nodeId) => edit(placeReference(plan, reference.id, nodeId))}
						onShown={onShown}
						shown={reference.id === shown}
					/>
				),
			)}

			{adding ? (
				<ReferenceForm
					onCancel={() => setAdding(false)}
					onSave={(content) => {
						setAdding(false)
						edit(addReference(content))
					}}
				/>
			) : (
				<Button className="self-start" onClick={() => setAdding(true)} size="sm">
					+ reference
				</Button>
			)}
		</div>
	)
}

interface ReferenceRowProps {
	entry: ReferenceEntry
	entries: OutlineEntry[]
	onOpen: () => void
	onPlace: (nodeId: string | null) => void
	shown: boolean
	onShown?: () => void
}

function ReferenceRow({
	entry,
	entries,
	onOpen,
	onPlace,
	shown,
	onShown,
}: ReferenceRowProps) {
	const { reference } = entry
	const row = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!shown) return

		row.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
		// The wash is a pointer, not a state the row is in, so it lets go by
		// itself rather than waiting for the writer to dismiss it.
		const held = setTimeout(() => onShown?.(), 1600)

		return () => clearTimeout(held)
	}, [shown, onShown])

	const attribution = [
		reference.source?.author,
		reference.source?.publication,
		reference.source?.year,
		reference.source?.url,
	]
		.filter(Boolean)
		.join(' · ')

	return (
		<div
			ref={row}
			className={cx(
				'flex flex-col gap-1.5 rounded-md border p-2 transition-colors',
				shown ? 'border-accent-edge bg-accent-soft' : 'border-edge bg-surface',
			)}
		>
			<div className="flex items-baseline gap-2">
				<Chip className="font-mono" variant="outline">
					{referenceMark(entry)}
				</Chip>
				{reference.source?.title ? (
					<p className="min-w-0 flex-1 text-[0.75rem] leading-snug font-medium text-ink">
						{reference.source.title}
					</p>
				) : (
					<span className="flex-1" />
				)}
				<Button onClick={onOpen} size="sm" variant="quiet">
					edit
				</Button>
			</div>

			{reference.text ? (
				<blockquote className="border-l-2 border-rule pl-2.5 text-[0.8125rem] leading-relaxed text-ink">
					“{reference.text}”
				</blockquote>
			) : null}

			{attribution === '' ? null : (
				<p className="text-[0.6875rem] text-faint">{attribution}</p>
			)}
			{reference.note ? (
				<p className="text-[0.75rem] text-muted">{reference.note}</p>
			) : null}

			<select
				aria-label={`Where ${referenceMark(entry)}, ${referenceName(reference)}, sits`}
				className="h-7 rounded-md border border-edge bg-surface px-2 text-[0.75rem] text-ink"
				onChange={(event) =>
					onPlace(event.target.value === '' ? null : event.target.value)
				}
				value={reference.nodeId ?? ''}
			>
				<option value="">not placed</option>
				{entries.map((entry) => (
					<option key={entry.node.id} value={entry.node.id}>
						{entry.ordinal} {entry.node.title === '' ? 'Untitled' : entry.node.title}
					</option>
				))}
			</select>
		</div>
	)
}
