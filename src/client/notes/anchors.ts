import type { BlockRow } from '../../shared/draft'
import { blockOrdinals } from '../../shared/draft'
import type { NoteAnchor } from '../../shared/note'
import type { Plan } from '../../shared/plan'
import { outlineEntries, sectionLabel } from '../plan/outline'

/**
 * A stored anchor names ids; the writer reads positions. This turns the first
 * into the second — `docs/reviews.md`.
 */

export type AnchorNaming = {
	/** False until the Plan arrives, which is not the same answer as "gone". */
	planHasArrived: boolean
	/** Section id → the Outline's number for it, "2" or "2.1". */
	sectionOrdinals: ReadonlyMap<string, string>
	/** Block id → where it sits in the Draft, counted from 1. */
	paragraphOrdinals: ReadonlyMap<string, number>
}

/** Built once per Plan and Draft. Every Note on screen asks one of these
 * questions on every render. */
export function anchorNaming(
	plan: Plan | null,
	blocks: readonly BlockRow[],
): AnchorNaming {
	const sectionOrdinals = new Map<string, string>()
	if (plan !== null) {
		for (const entry of outlineEntries(plan.outline)) {
			sectionOrdinals.set(entry.node.id, entry.ordinal)
		}
	}

	return {
		planHasArrived: plan !== null,
		sectionOrdinals,
		paragraphOrdinals: blockOrdinals(blocks),
	}
}

export type AnchorLabel = {
	text: string
	/** What it named is gone from the Draft or the Plan. */
	orphaned: boolean
}

export function anchorLabel(anchor: NoteAnchor, naming: AnchorNaming): AnchorLabel {
	if (anchor.kind === 'article') return { text: 'whole piece', orphaned: false }

	if (anchor.kind === 'section') {
		if (!naming.planHasArrived) return { text: 'a Section', orphaned: false }

		const ordinal = naming.sectionOrdinals.get(anchor.nodeId)

		return ordinal === undefined
			? { text: 'a Section that is gone', orphaned: true }
			: { text: sectionLabel({ ordinal }), orphaned: false }
	}

	// A run is read as the span from its first paragraph to its last.
	const numbers = anchor.blockIds
		.map((id) => naming.paragraphOrdinals.get(id))
		.filter((one): one is number => one !== undefined)
		.sort((a, b) => a - b)

	if (numbers.length === 0) return { text: 'a paragraph that is gone', orphaned: true }

	const first = numbers[0]
	const last = numbers[numbers.length - 1]

	return { text: first === last ? `¶${first}` : `¶${first}–¶${last}`, orphaned: false }
}
