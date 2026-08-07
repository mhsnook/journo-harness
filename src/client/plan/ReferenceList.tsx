import type { Plan, ProposalInput, Reference } from '../../shared/plan'
import { Chip } from '../components/Chip'
import { EmptySlot } from '../components/Field'
import { placeReference } from './edits'
import type { OutlineEntry } from './outline'

/**
 * The Plan's References, each placed at a Section or nowhere yet. References
 * are flat and carry an optional `nodeId`, so placing one is a field on the
 * Reference rather than a move in the Outline — docs/architecture.md §4.
 *
 * The type is read off the record and never derived from whether a text is
 * present: a Reference may carry a passage without being a Quote, and the two
 * Panels have to label one entry the same way.
 */

export interface ReferenceListProps {
	plan: Plan
	entries: OutlineEntry[]
	edit: (ops: ProposalInput | null) => void
	className?: string
}

export function ReferenceList({ plan, entries, edit, className }: ReferenceListProps) {
	if (plan.references.length === 0) {
		return (
			<EmptySlot className={className}>
				References arrive from the Chat, and land here once you Accept them
			</EmptySlot>
		)
	}

	return (
		<div className={className}>
			{plan.references.map((reference) => (
				<div
					key={reference.id}
					className="flex flex-col gap-1.5 rounded-md border border-edge bg-surface p-2"
				>
					<div className="flex items-baseline gap-2">
						<Chip variant="outline">{reference.type}</Chip>
						{reference.source?.title ? (
							<p className="min-w-0 flex-1 text-[0.75rem] leading-snug font-medium text-ink">
								{reference.source.title}
							</p>
						) : null}
					</div>

					{reference.text ? (
						<blockquote className="border-l-2 border-rule pl-2.5 text-[0.8125rem] leading-relaxed text-ink">
							“{reference.text}”
						</blockquote>
					) : null}

					{attribution(reference) === '' ? null : (
						<p className="text-[0.6875rem] text-faint">{attribution(reference)}</p>
					)}
					{reference.note ? (
						<p className="text-[0.75rem] text-muted">{reference.note}</p>
					) : null}

					<PlacementSelect
						entries={entries}
						nodeId={reference.nodeId}
						onPlace={(nodeId) => edit(placeReference(plan, reference.id, nodeId))}
						reference={reference}
					/>
				</div>
			))}
		</div>
	)
}

/** Everything in the attribution except the title, which heads the entry. */
function attribution(reference: Reference): string {
	const { author, publication, year, url } = reference.source ?? {}

	return [author, publication, year, url].filter(Boolean).join(' · ')
}

interface PlacementSelectProps {
	reference: Reference
	entries: OutlineEntry[]
	nodeId: string | null
	onPlace: (nodeId: string | null) => void
}

function PlacementSelect({ reference, entries, nodeId, onPlace }: PlacementSelectProps) {
	const label = reference.source?.title ?? reference.text ?? reference.id

	return (
		<select
			aria-label={`Where ${label} sits`}
			className="h-7 rounded-md border border-edge bg-surface px-2 text-[0.75rem] text-ink"
			onChange={(event) => onPlace(event.target.value === '' ? null : event.target.value)}
			value={nodeId ?? ''}
		>
			<option value="">not placed</option>
			{entries.map((entry) => (
				<option key={entry.node.id} value={entry.node.id}>
					{entry.ordinal} {entry.node.title === '' ? 'Untitled' : entry.node.title}
				</option>
			))}
		</select>
	)
}
