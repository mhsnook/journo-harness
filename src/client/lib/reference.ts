import type { Reference, Source } from '../../shared/plan'

/**
 * Reading a piece of Reference material out for the writer. An Offer and the
 * Plan's copy of one carry the same four fields, so both go through here and
 * the Offer ledger and the Plan Panel cannot name one item two ways.
 */

export type Material = Pick<Reference, 'text' | 'source'>

/** What heads a card or a row. A Reference is known by its source; a Quote
 * pulled without one is known by the passage. */
export function referenceHeading(material: Material): string {
	return material.source?.title ?? material.text ?? 'Untitled'
}

/** The attribution, in the parts the record actually carries. */
export function attribution(source: Source | undefined): string[] {
	if (source === undefined) return []

	return [source.author, source.publication, source.year]
		.filter((part) => part !== undefined)
		.map(String)
}

/** The same parts on one line, where the caller has no room to space them out. */
export function attributionLine(source: Source | undefined): string {
	return attribution(source).join(' · ')
}

/** What a pulled passage is credited to. It falls back to the attribution
 * rather than to the text, which is the passage itself. */
export function citation(material: Material): string {
	return material.source?.title ?? attributionLine(material.source)
}
