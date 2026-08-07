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

/** Its passage, or its title. Takes content rather than a Reference, so an
 * Offer reads the same way its Plan copy will. */
export function referenceName(content: ReferenceContent): string {
	if (content.text !== undefined) return `“${content.text}”`

	return content.source?.title ?? content.source?.url ?? 'Untitled link'
}

/** The parts the record carries, widest first. */
export function attribution(source: Source | undefined): string[] {
	if (source === undefined) return []

	return [source.author, source.publication, source.year]
		.filter((part) => part !== undefined)
		.map(String)
}

/** The same parts on one line, url last. A Plan Panel row has the width for a
 * url where a Chat card's meta line does not. */
export function sourceLine(source: Source | undefined): string {
	return [...attribution(source), source?.url].filter(Boolean).join(' · ')
}

/** The line under `referenceName`, carrying what the heading did not say: the
 * title under a passage, and the rest of the record under a title. A Link is
 * headed by its own title, so naming it again would print it twice. */
export function citation(content: ReferenceContent): string {
	const heading = referenceName(content)

	return [content.source?.title, ...attribution(content.source), content.source?.url]
		.filter((part) => part !== undefined && part !== heading)
		.join(' · ')
}

/** The ones no Section holds. In the Plan and ordinary — `ReferenceList` reads
 * the same state as "not placed" on its Section select. */
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
