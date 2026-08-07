import type { Plan, Reference, ReferenceContent, Source } from '../../shared/plan'

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

/** What a Reference reads as on one line: its passage, or its title.
 *
 * Takes content rather than a Reference, so an Offer goes through it too — the
 * Offer ledger and the Plan Panel would otherwise name one item two ways. */
export function referenceName(content: ReferenceContent): string {
	if (content.text !== undefined) return `“${content.text}”`

	return content.source?.title ?? content.source?.url ?? 'Untitled link'
}

/** The attribution, in the parts the record actually carries. */
export function attribution(source: Source | undefined): string[] {
	if (source === undefined) return []

	return [source.author, source.publication, source.year]
		.filter((part) => part !== undefined)
		.map(String)
}

/** Everything that says where a Reference came from, on one line, with the url
 * last. The Plan Panel's row has the width for it where a Chat card's meta line
 * does not, which is why `attribution` leaves it out and this does not. */
export function sourceLine(source: Source | undefined): string {
	return [...attribution(source), source?.url].filter(Boolean).join(' · ')
}

/** What a pulled passage is credited to. It falls back to the attribution
 * rather than to the text, which is the passage itself. */
export function citation(content: ReferenceContent): string {
	return content.source?.title ?? sourceLine(content.source)
}

/** The References the writer has Accepted and not yet placed. Distinct from a
 * stranded Offer, which is Accepted and in the Plan nowhere at all — §5. */
export function unplacedReferences(plan: Plan): Reference[] {
	return plan.references.filter((reference) => reference.nodeId === null)
}

/** Every Reference, numbered. */
export function referenceEntries(plan: Plan): ReferenceEntry[] {
	return plan.references.map((reference, index) => ({ reference, number: index + 1 }))
}

/** The References placed at one Section, keeping their numbers in the list. */
export function referencesAt(plan: Plan, nodeId: string): ReferenceEntry[] {
	return referenceEntries(plan).filter((entry) => entry.reference.nodeId === nodeId)
}
