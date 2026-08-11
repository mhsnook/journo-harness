import { describe, expect, it } from 'vitest'

import type { MapNode } from '../../src/client/plan/map'
import { linkPath, planMap } from '../../src/client/plan/map'
import type { OutlineNode } from '../../src/shared/plan'
import { makeNode, makePlan, makeReference } from '../shared/plan-fixtures'

/**
 * Where the Map View puts each box. The defaults the layout ships with are the
 * numbers below: a box is 210 wide, columns sit 40 apart, and rows sit 10
 * apart. A box is 48 tall, plus 18 where it carries an intent note and 16 where
 * References are placed at it.
 */

const NODE = 210
const COLUMN = NODE + 40
const ROW = 48 + 10

/** The map of a Plan whose Outline is the nodes given. */
function mapOf(outline: OutlineNode[]) {
	return planMap(makePlan({ title: 'The article', outline }))
}

function at(nodes: MapNode[], key: string): MapNode {
	const found = nodes.find((node) => node.key === key)
	if (found === undefined) throw new Error(`No box for ${key}`)

	return found
}

describe('what the map holds', () => {
	it('makes the Article title the root, and hangs the Sections off it', () => {
		const { nodes } = mapOf([makeNode({ id: 'a' }), makeNode({ id: 'b' })])

		expect(nodes.map((node) => node.key)).toEqual(['root', 'n:a', 'n:b'])
		expect(at(nodes, 'root').title).toBe('The article')
		expect(at(nodes, 'root').nodeId).toBeNull()
	})

	// A Section whose id is "root" would otherwise take the title's own key.
	it('keys a Section apart from the root even where its id is root', () => {
		const { nodes } = mapOf([makeNode({ id: 'root' })])

		expect(nodes.map((node) => node.key)).toEqual(['root', 'n:root'])
	})

	it('numbers rows the way the Outline does', () => {
		const { nodes } = mapOf([
			makeNode({ id: 'a' }),
			makeNode({ id: 'b', children: [makeNode({ id: 'b1' }), makeNode({ id: 'b2' })] }),
		])

		expect(nodes.map((node) => node.ordinal)).toEqual(['', '1', '2', '2.1', '2.2'])
	})

	it('draws a Plan with no Sections as the title on its own', () => {
		const { nodes, links } = mapOf([])

		expect(nodes).toHaveLength(1)
		expect(links).toHaveLength(0)
	})
})

describe('where the boxes sit', () => {
	it('puts each depth in its own column', () => {
		const { nodes } = mapOf([makeNode({ id: 'a', children: [makeNode({ id: 'a1' })] })])

		expect(at(nodes, 'root').x).toBe(0)
		expect(at(nodes, 'n:a').x).toBe(COLUMN)
		expect(at(nodes, 'n:a1').x).toBe(COLUMN * 2)
	})

	it('stacks the leaves down the page in reading order', () => {
		const { nodes } = mapOf([makeNode({ id: 'a' }), makeNode({ id: 'b' })])

		expect(at(nodes, 'n:a').y).toBe(0)
		expect(at(nodes, 'n:b').y).toBe(ROW)
	})

	it('centres a parent on the children it holds', () => {
		const { nodes } = mapOf([makeNode({ id: 'a' }), makeNode({ id: 'b' })])

		const middle = (node: MapNode) => node.y + node.height / 2
		const root = at(nodes, 'root')

		expect(middle(root)).toBe((middle(at(nodes, 'n:a')) + middle(at(nodes, 'n:b'))) / 2)
	})

	// The height a Section takes is what a fixed-size tree layout cannot state,
	// so the layout asks for it per node rather than assuming one number.
	it('gives a Section carrying an intent note a taller box', () => {
		const { nodes } = mapOf([
			makeNode({ id: 'a', intent: 'What this Section does' }),
			makeNode({ id: 'b' }),
		])

		expect(at(nodes, 'n:a').height).toBe(66)
		expect(at(nodes, 'n:b').height).toBe(48)
		expect(at(nodes, 'n:b').y).toBe(66 + 10)
	})
})

describe('a parent that would ride up into the box above it', () => {
	// A parent taller than the subtree under it centres above its own floor. It
	// takes the floor instead, and the subtree moves down with it rather than
	// being left behind.
	const tall = planMap(
		makePlan({
			outline: [
				makeNode({ id: 'a' }),
				makeNode({ id: 'b', children: [makeNode({ id: 'b1' })] }),
			],
		}),
		{ heightOf: (_node, depth) => (depth === 1 ? 100 : 44) },
	)

	it('drops the parent to the floor', () => {
		expect(at(tall.nodes, 'n:a').y).toBe(0)
		expect(at(tall.nodes, 'n:b').y).toBe(110)
	})

	it('moves the child down by the same amount', () => {
		expect(at(tall.nodes, 'n:b1').y).toBe(138)
	})
})

describe('no two boxes in one column overlap', () => {
	// Three subtrees of different shapes, so the check meets a short one next to
	// a tall one in both orders.
	const { nodes } = mapOf([
		makeNode({ id: 'a' }),
		makeNode({
			id: 'b',
			intent: 'A note, which makes this box taller',
			children: [makeNode({ id: 'b1' }), makeNode({ id: 'b2' }), makeNode({ id: 'b3' })],
		}),
		makeNode({ id: 'c', children: [makeNode({ id: 'c1' })] }),
		makeNode({ id: 'd' }),
	])

	const depths = [...new Set(nodes.map((node) => node.depth))]

	it.each(depths)('holds in column %i', (depth) => {
		const column = nodes
			.filter((node) => node.depth === depth)
			.sort((one, two) => one.y - two.y)

		for (const [index, node] of column.entries()) {
			if (index === 0) continue
			const above = column[index - 1]!
			expect(node.y, `${node.key} sits inside ${above.key}`).toBeGreaterThanOrEqual(
				above.y + above.height,
			)
		}
	})
})

describe('a collapsed Section', () => {
	const { nodes, links } = planMap(
		makePlan({
			outline: [
				makeNode({ id: 'a', children: [makeNode({ id: 'a1' }), makeNode({ id: 'a2' })] }),
			],
		}),
		{ collapsed: new Set(['a']) },
	)

	it('leaves its children undrawn', () => {
		expect(nodes.map((node) => node.key)).toEqual(['root', 'n:a'])
		expect(links).toHaveLength(1)
	})

	// The box says how much is folded away, so the writer knows there is
	// something to open rather than reading a leaf.
	it('still says how many children it holds', () => {
		expect(at(nodes, 'n:a').childCount).toBe(2)
		expect(at(nodes, 'n:a').collapsed).toBe(true)
	})
})

describe('the References placed at a Section', () => {
	// Numbered by position in the Plan's list, which is what `references.ts`
	// marks them with — a footnote number rather than anything stored.
	const { nodes } = planMap(
		makePlan({
			outline: [makeNode({ id: 'a' }), makeNode({ id: 'b' })],
			references: [
				makeReference({ id: 'r1', nodeId: 'b' }),
				makeReference({ id: 'r2', nodeId: null }),
				makeReference({ id: 'r3', nodeId: 'b' }),
			],
		}),
	)

	it('marks each box with the numbers placed there', () => {
		expect(at(nodes, 'n:b').referenceNumbers).toEqual([1, 3])
		expect(at(nodes, 'n:a').referenceNumbers).toEqual([])
	})

	// A Reference is placed at a Section or at nothing, so the title never
	// carries one and its box never grows a row for it.
	it('leaves the root out of it', () => {
		expect(at(nodes, 'root').referenceNumbers).toEqual([])
	})

	it('gives the box a row to say them in', () => {
		expect(at(nodes, 'n:b').height).toBe(48 + 16)
		expect(at(nodes, 'n:a').height).toBe(48)
	})
})

describe('the path back to the root', () => {
	const { nodes } = mapOf([makeNode({ id: 'a', children: [makeNode({ id: 'a1' })] })])

	it('lists every ancestor, nearest first', () => {
		expect(at(nodes, 'n:a1').ancestors).toEqual(['n:a', 'root'])
		expect(at(nodes, 'n:a').ancestors).toEqual(['root'])
		expect(at(nodes, 'root').ancestors).toEqual([])
	})
})

describe('the curve between two boxes', () => {
	const parent: MapNode = {
		key: 'root',
		parentKey: null,
		nodeId: null,
		node: null,
		title: '',
		ordinal: '',
		depth: 0,
		x: 0,
		y: 27,
		width: 180,
		height: 44,
		childCount: 1,
		referenceNumbers: [],
		collapsed: false,
		ancestors: [],
	}
	const child: MapNode = {
		...parent,
		key: 'n:a',
		parentKey: 'root',
		x: 224,
		y: 0,
		depth: 1,
	}

	// Out of the parent's right edge, into the child's left edge, turning at the
	// midpoint between the two columns — the cubic `curveBumpX` generates.
	it('leaves one edge and arrives at the other', () => {
		expect(linkPath(parent, child)).toBe('M180,49C202,49 202,22 224,22')
	})

	it('is what the map hands back', () => {
		const { nodes, links } = mapOf([makeNode({ id: 'a' })])

		expect(links).toHaveLength(1)
		expect(links[0]!.d).toBe(linkPath(at(nodes, 'root'), at(nodes, 'n:a')))
	})
})

describe('what the SVG has to be big enough for', () => {
	it('reaches the far edge of the deepest column and the lowest box', () => {
		const { nodes, width, height } = mapOf([
			makeNode({ id: 'a', children: [makeNode({ id: 'a1' })] }),
			makeNode({ id: 'b' }),
		])

		expect(width).toBe(COLUMN * 2 + NODE)
		expect(height).toBe(Math.max(...nodes.map((node) => node.y + node.height)))
	})
})
