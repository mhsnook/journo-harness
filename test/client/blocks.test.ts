import { getSchema } from '@tiptap/core'
import { Node as PmNode } from '@tiptap/pm/model'
import { describe, expect, it } from 'vitest'

import {
	assignOrds,
	type BlockEntry,
	BLOCK_ID_ATTR,
	toDoc,
	toEntries,
	toRows,
	topLevelTypes,
} from '../../src/client/draft/blocks'
import { BLOCK_TYPES, draftExtensions } from '../../src/client/draft/editor'
import type { BlockRow } from '../../src/shared/draft'

const schema = getSchema(draftExtensions)

const entries = (...ids: string[]): BlockEntry[] =>
	ids.map((id) => ({ id, json: { type: 'paragraph' } }))

const fresh = (...ids: string[]) => assignOrds(entries(...ids), [])

const ords = (rows: readonly BlockRow[]) =>
	Object.fromEntries(rows.map((row) => [row.id, row.ord]))

/** A document built the way the editor would, ids and all. */
function docOf(...nodes: object[]): PmNode {
	return PmNode.fromJSON(schema, { type: 'doc', content: nodes })
}

const para = (id: string, text: string) => ({
	type: 'paragraph',
	attrs: { [BLOCK_ID_ATTR]: id },
	content: [{ type: 'text', text }],
})

describe('topLevelTypes', () => {
	it('covers every type the document will take as a child', () => {
		// The set `UniqueID` mints for has to be this one exactly. A type missing
		// from it gets no id, so `toEntries` drops it and the writer loses that
		// prose on the next load with nothing said.
		expect([...BLOCK_TYPES].sort()).toEqual(topLevelTypes(schema))
	})

	it('includes the block types reachable without a toolbar button', () => {
		// `- `, `> `, `1. ` and ``` are all input rules StarterKit installs.
		expect(BLOCK_TYPES).toEqual(
			expect.arrayContaining([
				'paragraph',
				'heading',
				'horizontalRule',
				'bulletList',
				'orderedList',
				'blockquote',
				'codeBlock',
			]),
		)
	})

	it('leaves out types that are never a top-level child', () => {
		expect(BLOCK_TYPES).not.toContain('text')
		expect(BLOCK_TYPES).not.toContain('listItem')
	})
})

describe('toEntries', () => {
	it('reads the direct children of the document, in order', () => {
		const doc = docOf(para('a', 'One.'), para('b', 'Two.'))
		expect(toEntries(doc).map((entry) => entry.id)).toEqual(['a', 'b'])
	})

	it('keeps a list as one Block rather than dropping it', () => {
		const doc = docOf(
			para('a', 'One.'),
			{
				type: 'bulletList',
				attrs: { [BLOCK_ID_ATTR]: 'list' },
				content: [
					{ type: 'listItem', content: [para('li', 'First')] },
					{ type: 'listItem', content: [para('li2', 'Second')] },
				],
			},
			para('b', 'Two.'),
		)

		// Three Blocks, not five: the list items are inside the list's own JSON.
		expect(toEntries(doc).map((entry) => entry.id)).toEqual(['a', 'list', 'b'])
	})

	it('carries the content as JSON rather than as text', () => {
		const doc = docOf({
			type: 'heading',
			attrs: { level: 2, [BLOCK_ID_ATTR]: 'h' },
			content: [{ type: 'text', text: 'What it costs' }],
		})

		const [entry] = toEntries(doc)
		expect(entry.json.type).toBe('heading')
		// The level would be gone if the Block stored `textContent`.
		expect((entry.json.attrs as { level: number }).level).toBe(2)
	})
})

describe('assignOrds', () => {
	it('numbers a new Draft from one', () => {
		expect(ords(fresh('a', 'b', 'c'))).toEqual({ a: 1, b: 2, c: 3 })
	})

	it('leaves every ord alone when only the content changed', () => {
		const before = fresh('a', 'b', 'c')
		const after = assignOrds(
			[{ id: 'a', json: { type: 'paragraph', changed: true } }, ...entries('b', 'c')],
			before,
		)

		expect(ords(after)).toEqual(ords(before))
	})

	it('gives an inserted Block the midpoint and renumbers no neighbour', () => {
		const after = assignOrds(entries('a', 'new', 'b'), fresh('a', 'b'))
		expect(ords(after)).toEqual({ a: 1, new: 1.5, b: 2 })
	})

	it('renumbers a Block that moved and leaves the ones that did not', () => {
		const after = assignOrds(entries('a', 'c', 'b'), fresh('a', 'b', 'c'))

		expect(after[0].ord).toBe(1)
		expect(after[1].ord).toBe(3)
		expect(after[2].ord).toBeGreaterThan(3)
	})

	it('drops the ords of Blocks that are gone', () => {
		expect(ords(assignOrds(entries('a', 'c'), fresh('a', 'b', 'c')))).toEqual({
			a: 1,
			c: 3,
		})
	})

	it('renumbers the document rather than letting midpoints collapse', () => {
		// Splitting the same gap over and over exhausts float precision at ~52,
		// after which two Blocks share an ord and `ORDER BY ord` is arbitrary.
		let rows = fresh('a', 'z')
		const order = ['a']

		for (let i = 0; i < 80; i += 1) {
			order.splice(1, 0, `s${i}`)
			rows = assignOrds(entries(...order, 'z'), rows)
		}

		const values = rows.map((row) => row.ord)
		expect(new Set(values).size).toBe(values.length)
		expect(values).toEqual([...values].sort((x, y) => x - y))
		// Document order is what it was; only the numbering changed.
		expect(rows.map((row) => row.id)).toEqual([...order, 'z'])
	})
})

describe('toDoc', () => {
	it('is undefined for an empty Draft', () => {
		// The doc takes `block+`, so an empty one is not a valid document.
		expect(toDoc([])).toBeUndefined()
	})

	it('orders by ord rather than by the order the rows arrived', () => {
		const doc = toDoc([
			{ id: 'b', ord: 2, json: para('b', 'Two.') },
			{ id: 'a', ord: 1, json: para('a', 'One.') },
		])

		expect(doc?.content?.map((node) => node.attrs?.[BLOCK_ID_ATTR])).toEqual(['a', 'b'])
	})

	it('writes the id from the row, so the column wins over the content', () => {
		const doc = toDoc([{ id: 'right', ord: 1, json: para('stale', 'One.') }])
		expect(doc?.content?.[0].attrs?.[BLOCK_ID_ATTR]).toBe('right')
	})

	it('round-trips a document through rows and back', () => {
		const before = docOf(
			{
				type: 'heading',
				attrs: { level: 2, [BLOCK_ID_ATTR]: 'h' },
				content: [{ type: 'text', text: 'What it costs' }],
			},
			{
				type: 'paragraph',
				attrs: { [BLOCK_ID_ATTR]: 'p' },
				content: [
					{ type: 'text', text: 'Officers put it at ' },
					{ type: 'text', marks: [{ type: 'bold' }], text: '£2.4m' },
				],
			},
			{ type: 'horizontalRule', attrs: { [BLOCK_ID_ATTR]: 'hr' } },
		)

		const rows = toRows(before, [])
		const after = PmNode.fromJSON(schema, toDoc(rows) as never)

		expect(after.toJSON()).toEqual(before.toJSON())
	})
})
