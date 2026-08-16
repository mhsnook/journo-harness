import type { JSONContent } from '@tiptap/core'
import type { Node as PmNode, Schema } from '@tiptap/pm/model'

import type { BlockJson, BlockRow } from '../../shared/draft'

/** The attribute `UniqueID` writes, and the DOM attribute it renders as. */
export const BLOCK_ID_ATTR = 'block-id'

/** One Block as the editor holds it, before it has an `ord`. */
export interface BlockEntry {
	id: string
	json: BlockJson
}

export function mintBlockId(): string {
	return crypto.randomUUID()
}

/**
 * Every node type the document will take as a top-level child, which is exactly
 * the set that can be a Block.
 *
 * Read off the schema rather than listed, because the list drifts: a bulleted
 * list and a blockquote are reachable from an input rule with no toolbar button,
 * and a Block type missing from here gets no id and is dropped on the next save.
 */
export function topLevelTypes(schema: Schema): string[] {
	const docContent = schema.nodes.doc.contentMatch

	return Object.values(schema.nodes)
		.filter((type) => docContent.matchType(type) !== null)
		.map((type) => type.name)
		.sort()
}

/**
 * Reads the Blocks out of a document, in document order.
 *
 * Only direct children of the doc, so **a Block is a top-level child** holds by
 * construction. Walking descendants instead would need a list of which types
 * count, and would silently drop the ones nobody remembered to add.
 */
export function toEntries(doc: PmNode): BlockEntry[] {
	const entries: BlockEntry[] = []

	doc.forEach((node) => {
		const id = node.attrs[BLOCK_ID_ATTR] as string | null | undefined
		if (id !== null && id !== undefined) {
			entries.push({ id, json: node.toJSON() as BlockJson })
		}
	})

	return entries
}

/**
 * Gives each Block an `ord`, reusing the one it already had.
 *
 * A new Block takes the midpoint between its neighbours rather than a position
 * in a sequence, so an insert writes one row instead of renumbering everything
 * after it.
 */
export function assignOrds(
	entries: readonly BlockEntry[],
	previous: readonly BlockRow[],
): BlockRow[] {
	const previousOrds = new Map(previous.map((row) => [row.id, row.ord]))
	const rows: BlockRow[] = []
	let lastOrd = 0

	entries.forEach((entry, i) => {
		const keptOrd = previousOrds.get(entry.id)
		// A kept ord survives only while it still sorts after the row before it,
		// so a Block that moved is renumbered and its neighbours are not.
		let ord = keptOrd !== undefined && keptOrd > lastOrd ? keptOrd : null

		if (ord === null) {
			const nextOrd = entries
				.slice(i + 1)
				.map((later) => previousOrds.get(later.id))
				.find((value) => value !== undefined && value > lastOrd)

			ord = nextOrd === undefined ? lastOrd + 1 : (lastOrd + nextOrd) / 2
		}

		rows.push({ id: entry.id, ord, json: entry.json })
		lastOrd = ord
	})

	// Midpoints stop separating after ~52 splits in one gap, and two equal ords
	// make `ORDER BY ord` arbitrary — so the Draft would come back in an order
	// the writer never wrote, with nothing to say it had. Renumbering costs a
	// save of every row, which is the right price for never reordering prose.
	const collapsed = rows.some((row, i) => i > 0 && row.ord <= rows[i - 1].ord)
	return collapsed ? rows.map((row, i) => ({ ...row, ord: i + 1 })) : rows
}

export function toRows(doc: PmNode, previous: readonly BlockRow[]): BlockRow[] {
	return assignOrds(toEntries(doc), previous)
}

/**
 * Builds the document the editor opens with.
 *
 * The id is written from the row rather than trusted from the stored content,
 * so the column stays authoritative and the two cannot drift. Without it
 * `UniqueID` mints fresh ids on load and every note anchored to a Block is
 * orphaned by opening the Article.
 *
 * Returns `undefined` for an empty Draft: the doc takes `block+`, so a document
 * with no content is not a valid one — let the editor build its own.
 */
export function toDoc(rows: readonly BlockRow[]): JSONContent | undefined {
	if (rows.length === 0) return undefined

	return {
		type: 'doc',
		content: [...rows]
			.sort((a, b) => a.ord - b.ord)
			.map((row) => ({
				...row.json,
				attrs: { ...(row.json.attrs as object | undefined), [BLOCK_ID_ATTR]: row.id },
			})),
	}
}
