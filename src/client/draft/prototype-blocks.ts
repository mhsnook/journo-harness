import { type Node as PmNode, Schema } from 'prosemirror-model'
import { Plugin } from 'prosemirror-state'

/**
 * PROTOTYPE — issue #14, picking the Draft editor. Throwaway.
 *
 * The question: when the writer splits, merges, pastes into, and deletes
 * paragraphs, what happens to a Block's identity and to the Guidance notes
 * anchored to it? #7 fixed the Draft at one party-db row per Block and gave
 * notes a `block_id` anchor, which survives typing *above* a paragraph for
 * free. Editing the paragraph itself is where the candidates differ, and this
 * module is the rule that decides it.
 *
 * Everything here is deliberately independent of React and of party-db.
 */

/** One party-db row, as the Draft would sync it. */
export interface BlockRow {
	id: string
	/** Fractional index. Carried across edits so an insert never renumbers. */
	ord: number
	text: string
}

/**
 * Paragraphs and text, nothing else. Marks are left out on purpose: bold and
 * italic have no bearing on Block identity, and every node the schema admits is
 * another case the id rule has to answer for.
 */
export const schema = new Schema({
	nodes: {
		doc: { content: 'paragraph+' },
		paragraph: {
			content: 'text*',
			attrs: { blockId: { default: null } },
			parseDOM: [
				{
					tag: 'p',
					getAttrs: (el: HTMLElement) => ({ blockId: el.getAttribute('data-block-id') }),
				},
			],
			toDOM: (node) => ['p', { 'data-block-id': node.attrs.blockId as string }, 0],
		},
		text: {},
	},
})

let minted = 0

/** Stands in for the ULID #7 asks for. Short, so the readout stays readable. */
export function mintBlockId(): string {
	minted += 1
	return `b${minted + 100}`
}

/**
 * Gives every paragraph a `blockId` and keeps them unique.
 *
 * **The rule: earlier in the document keeps the id.** That single line decides
 * the split, because a split arrives here as either a paragraph with no id or
 * two paragraphs sharing one — ProseMirror's `splitBlock` copies the attrs or
 * defaults them depending on the path taken, and this rule reads the same
 * either way. The first half keeps its notes; the new half starts clean.
 *
 * It is a convention rather than a deduction, and the case it gets wrong is
 * visible in the prototype: split at the very top of a paragraph and the notes
 * stay on the empty half while the prose moves away.
 */
export function blockIds() {
	return new Plugin({
		appendTransaction(_trs, _old, state) {
			const seen = new Set<string>()
			const tr = state.tr
			let changed = false

			state.doc.descendants((node, pos) => {
				if (node.type !== schema.nodes.paragraph) return false

				const id = node.attrs.blockId as string | null
				if (id !== null && !seen.has(id)) {
					seen.add(id)
					return false
				}

				// Attrs do not move anything, so positions read off `state.doc`
				// stay valid for the whole walk.
				const fresh = mintBlockId()
				seen.add(fresh)
				tr.setNodeAttribute(pos, 'blockId', fresh)
				changed = true
				return false
			})

			return changed ? tr : null
		},
	})
}

/**
 * Projects the document onto the rows party-db would hold.
 *
 * `ord` is carried rather than recomputed, so inserting a Block between two
 * others leaves both neighbours' rows untouched — which is the property that
 * keeps a paste from dirtying the whole Draft. Midpoints run out of float
 * precision after ~50 splits in one gap; real fractional indexing uses base-62
 * strings, and that is a detail for the build rather than for this question.
 */
export function toRows(doc: PmNode, previous: readonly BlockRow[]): BlockRow[] {
	const entries: BlockEntry[] = []

	doc.descendants((node) => {
		if (node.type !== schema.nodes.paragraph) return false
		entries.push({ id: node.attrs.blockId as string, text: node.textContent })
		return false
	})

	return assignOrds(entries, previous)
}

/** One Block as the editor sees it, before it has an `ord`. */
export interface BlockEntry {
	id: string
	text: string
}

/** The `ord` half of `toRows`, which both prototype panels share. */
export function assignOrds(
	entries: readonly BlockEntry[],
	previous: readonly BlockRow[],
): BlockRow[] {
	const held = new Map(previous.map((row) => [row.id, row.ord]))
	const rows: BlockRow[] = []
	let last = 0

	entries.forEach((entry, i) => {
		const kept = held.get(entry.id)
		// A kept ord is reused only while it still sorts after the row before
		// it. A Block that moved gets a new one; its neighbours keep theirs.
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

/** The Blocks a set of notes points at that no longer exist. */
export function orphaned(
	rows: readonly BlockRow[],
	anchors: readonly string[],
): string[] {
	const live = new Set(rows.map((row) => row.id))
	return anchors.filter((anchor) => !live.has(anchor))
}
