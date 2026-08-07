import type { Plan, Reference } from '../../shared/plan'

/** Reading the References list for the Panel. */

export type ReferenceEntry = {
	reference: Reference
	/** Where it sits in the list, counting from 1. */
	number: number
}

/**
 * What a Reference is called where there is one line to say it in: its type,
 * then its number in the References list — `link [2]`, `quote [3]`.
 *
 * The number is the position in the list rather than anything stored, the way a
 * footnote number is. Deleting one renumbers the rest, and nothing refers to a
 * Reference by it.
 */
export function referenceMark(entry: ReferenceEntry): string {
	return `${entry.reference.type} [${entry.number}]`
}

/** What a Reference reads as on one line: its passage, or its title. */
export function referenceName(reference: Reference): string {
	if (reference.text !== undefined) return `“${reference.text}”`

	return reference.source?.title ?? reference.source?.url ?? 'Untitled link'
}

/** Every Reference, numbered. */
export function referenceEntries(plan: Plan): ReferenceEntry[] {
	return plan.references.map((reference, index) => ({ reference, number: index + 1 }))
}

/** The References placed at one Section, keeping their numbers in the list. */
export function referencesAt(plan: Plan, nodeId: string): ReferenceEntry[] {
	return referenceEntries(plan).filter((entry) => entry.reference.nodeId === nodeId)
}
