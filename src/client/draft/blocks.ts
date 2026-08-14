import type { Node as PmNode } from '@tiptap/pm/model'

/** The block-level nodes the Draft stores, one party-db row each. */
export const BLOCK_TYPES = ['paragraph', 'heading', 'horizontalRule'] as const

/** One Block, as it is stored and synced. */
export interface BlockRow {
	id: string
	/** Fractional index, so inserting between two Blocks renumbers neither. */
	ord: number
	text: string
}

/** One Block as the editor holds it, before it has an `ord`. */
export interface BlockEntry {
	id: string
	text: string
}

export function mintBlockId(): string {
	return crypto.randomUUID()
}

/** Reads the Blocks out of a document, in document order. */
export function toEntries(doc: PmNode): BlockEntry[] {
	const types: readonly string[] = BLOCK_TYPES
	const entries: BlockEntry[] = []

	doc.descendants((node) => {
		if (!types.includes(node.type.name)) return false

		const id = node.attrs['block-id'] as string | null
		if (id !== null) entries.push({ id, text: node.textContent })
		return false
	})

	return entries
}

/**
 * Gives each Block an `ord`, reusing the one it already had.
 *
 * A new Block takes the midpoint between its neighbours rather than a position
 * in a sequence, so an insert writes one row instead of renumbering everything
 * after it. Midpoints exhaust float precision after roughly fifty splits in one
 * gap; a Draft that reaches it needs base-62 string indices instead.
 */
export function assignOrds(
	entries: readonly BlockEntry[],
	previous: readonly BlockRow[],
): BlockRow[] {
	const held = new Map(previous.map((row) => [row.id, row.ord]))
	const rows: BlockRow[] = []
	let last = 0

	entries.forEach((entry, i) => {
		const kept = held.get(entry.id)
		// A held ord survives only while it still sorts after the row before it,
		// so a Block that moved is renumbered and its neighbours are not.
		let ord = kept !== undefined && kept > last ? kept : null

		if (ord === null) {
			const after = entries
				.slice(i + 1)
				.map((later) => held.get(later.id))
				.find((value) => value !== undefined && value > last)

			ord = after === undefined ? last + 1 : (last + after) / 2
		}

		rows.push({ id: entry.id, ord, text: entry.text })
		last = ord
	})

	return rows
}

export function toRows(doc: PmNode, previous: readonly BlockRow[]): BlockRow[] {
	return assignOrds(toEntries(doc), previous)
}
