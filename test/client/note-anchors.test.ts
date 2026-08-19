import { describe, expect, it } from 'vitest'

import { anchorLabel, anchorNaming } from '../../src/client/notes/anchors'
import { makeNode, makePlan } from '../shared/plan-fixtures'

const plan = makePlan({
	outline: [
		makeNode({ id: 'n1', title: 'The opening' }),
		makeNode({
			id: 'n2',
			title: 'The middle',
			children: [makeNode({ id: 'n2a', title: 'The wards' })],
		}),
	],
})

const blocks = [
	{ id: 'b1', ord: 1, json: { type: 'paragraph' } },
	{ id: 'b2', ord: 2, json: { type: 'paragraph' } },
	{ id: 'b3', ord: 3, json: { type: 'paragraph' } },
	{ id: 'b4', ord: 4, json: { type: 'paragraph' } },
]

const naming = anchorNaming(plan, blocks)

describe('what a Note anchor reads as', () => {
	it('names the whole piece', () => {
		expect(anchorLabel({ kind: 'article' }, naming)).toEqual({
			text: 'whole piece',
			orphaned: false,
		})
	})

	it('numbers a Section the way the Outline does', () => {
		expect(anchorLabel({ kind: 'section', nodeId: 'n2' }, naming).text).toBe('§2')
		expect(anchorLabel({ kind: 'section', nodeId: 'n2a' }, naming).text).toBe('§2.1')
	})

	it('numbers one paragraph', () => {
		expect(anchorLabel({ kind: 'blocks', blockIds: ['b3'] }, naming).text).toBe('¶3')
	})

	it('reads a run as the span from its first paragraph to its last', () => {
		expect(anchorLabel({ kind: 'blocks', blockIds: ['b4', 'b2'] }, naming).text).toBe(
			'¶2–¶4',
		)
	})

	it('narrows a run to the paragraphs that survive a deletion', () => {
		const fewer = anchorNaming(plan, blocks.slice(0, 3))

		expect(anchorLabel({ kind: 'blocks', blockIds: ['b2', 'b3', 'b4'] }, fewer)).toEqual({
			text: '¶2–¶3',
			orphaned: false,
		})
	})

	it('says so when the paragraph a Note was about is gone', () => {
		expect(anchorLabel({ kind: 'blocks', blockIds: ['cut'] }, naming)).toEqual({
			text: 'a paragraph that is gone',
			orphaned: true,
		})
	})

	it('says so when the Section a Note was about is gone', () => {
		expect(anchorLabel({ kind: 'section', nodeId: 'cut' }, naming).orphaned).toBe(true)
	})

	it('does not call a Section gone when it is the Plan that has not arrived', () => {
		const early = anchorNaming(null, blocks)

		expect(anchorLabel({ kind: 'section', nodeId: 'n2' }, early)).toEqual({
			text: 'a Section',
			orphaned: false,
		})
	})
})
