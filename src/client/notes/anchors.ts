import type { BlockRow } from '../../shared/draft'
import { blockOrdinals } from '../../shared/draft'
import type { NoteAnchor } from '../../shared/note'
import type { Plan } from '../../shared/plan'
import { outlineEntries, sectionLabel } from '../plan/outline'

/**
 * What a Note's anchor reads as. The stored anchor names ids, which survive the
 * prose moving; the writer reads positions, which do not. This is the one place
 * that turns the first into the second.
 *
 * The paragraph numbers come from `blockOrdinals`, the same function that
 * numbers the Draft in the Review's prompt pack, so "¶3" means one paragraph
 * whichever side of the socket says it.
 */

export type AnchorNaming = {
	/** Null until the Plan arrives, which only costs a Section anchor its number. */
	plan: Plan | null
	/** Where each Block sits, from the Draft as it was last saved. */
	ordinals: ReadonlyMap<string, number>
}

export function anchorNaming(
	plan: Plan | null,
	blocks: readonly BlockRow[],
): AnchorNaming {
	return { plan, ordinals: blockOrdinals(blocks) }
}

/**
 * The anchor as a phrase, and whether what it named is still there.
 *
 * An orphaned anchor is said plainly rather than hidden. The Note is still the
 * writer's to resolve, and "the paragraph this was about is gone" is the most
 * useful thing the card can tell them about it.
 */
export type AnchorLabel = {
	text: string
	orphaned: boolean
}

export function anchorLabel(anchor: NoteAnchor, naming: AnchorNaming): AnchorLabel {
	if (anchor.kind === 'article') return { text: 'whole piece', orphaned: false }

	if (anchor.kind === 'section') {
		// A Plan that has not arrived is not a Section that is gone — §8. The
		// number is what is missing, so the card says which kind of thing it points
		// at and fills the number in when the Plan lands.
		if (naming.plan === null) return { text: 'a Section', orphaned: false }

		const entry = outlineEntries(naming.plan.outline).find(
			(one) => one.node.id === anchor.nodeId,
		)

		return entry === undefined
			? { text: 'a Section that is gone', orphaned: true }
			: { text: sectionLabel(entry), orphaned: false }
	}

	// A run is the span from its first paragraph to its last, so the two ends are
	// what the writer reads — the paragraphs between them belong to it whether or
	// not the model named them.
	const numbers = anchor.blockIds
		.map((id) => naming.ordinals.get(id))
		.filter((one): one is number => one !== undefined)
		.sort((a, b) => a - b)

	if (numbers.length === 0) return { text: 'a paragraph that is gone', orphaned: true }

	const first = numbers[0]
	const last = numbers[numbers.length - 1]

	return { text: first === last ? `¶${first}` : `¶${first}–¶${last}`, orphaned: false }
}
