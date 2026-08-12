import { describe, expect, it } from 'vitest'

import type { MapNode } from '../../src/client/plan/map'
import { linkPath, planMap, subjectId } from '../../src/client/plan/map'
import type { OutlineNode, Plan } from '../../src/shared/plan'
import { makeNode, makePlan, makeReference } from '../shared/plan-fixtures'

/**
 * Where the Map View puts each box. The defaults the layout ships with are the
 * numbers below: a box is 210 wide, columns sit 40 apart, and rows sit 10
 * apart. A Section is 48 tall, plus 18 where it carries an intent note; a
 * Reference is 44.
 *
 * The map has two shapes. `references` is the Outline the interface offers —
 * the title, one layer of Sections, and the References placed at each — and
 * `sections` nests Sections instead. Both are exercised here.
 */

const NODE = 210
const COLUMN = NODE + 40
const ROW = 48 + 10

/** The map of a Plan whose Outline is the nodes given, in whichever shape. */
function mapOf(outline: OutlineNode[], plan: Partial<Plan> = {}) {
	return planMap(makePlan({ title: 'The article', outline, ...plan }))
}

/** The recursive shape, which is the deferred idea rather than the screen. */
function nested(outline: OutlineNode[], plan: Partial<Plan> = {}) {
	return planMap(makePlan({ title: 'The article', outline, ...plan }), {
		branches: 'sections',
	})
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
		expect(at(nodes, 'root').subject.kind).toBe('article')
	})

	// A Section and a Reference carrying the same id would otherwise take one
	// key, and the root would take a Section's whose id is "root".
	it('keys the three kinds apart', () => {
		const { nodes } = mapOf([makeNode({ id: 'root' })], {
			references: [makeReference({ id: 'root', nodeId: 'root', text: 'A passage' })],
		})

		expect(nodes.map((node) => node.key)).toEqual(['root', 'n:root', 'r:root'])
	})

	it('numbers Sections the way the Outline does', () => {
		const { nodes } = nested([
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

describe('the shape the interface offers', () => {
	const { nodes } = mapOf([makeNode({ id: 'a' }), makeNode({ id: 'b' })], {
		references: [
			makeReference({ id: 'r1', nodeId: 'b', source: { title: 'A report' } }),
			makeReference({ id: 'r2', nodeId: null, source: { title: 'Unplaced' } }),
			makeReference({ id: 'r3', nodeId: 'b', text: 'A passage' }),
		],
	})

	it('hangs the References placed at a Section off it', () => {
		expect(nodes.map((node) => node.key)).toEqual(['root', 'n:a', 'n:b', 'r:r1', 'r:r3'])
	})

	// Three columns and no more: the title, its Sections, and what they draw on.
	it('puts each kind in its own column', () => {
		expect(at(nodes, 'root').x).toBe(0)
		expect(at(nodes, 'n:b').x).toBe(COLUMN)
		expect(at(nodes, 'r:r1').x).toBe(COLUMN * 2)
	})

	// A Reference keeps the number it has in the Plan's list, the way a footnote
	// does, rather than being renumbered by where it sits.
	it('marks a Reference with its number in the list', () => {
		expect(at(nodes, 'r:r1').ordinal).toBe('[1]')
		expect(at(nodes, 'r:r3').ordinal).toBe('[3]')
	})

	it('names a Reference the way every other surface names it', () => {
		expect(at(nodes, 'r:r1').title).toBe('A report')
		expect(at(nodes, 'r:r3').title).toBe('“A passage”')
	})

	// The Reference is a box of its own here, so a `refs [1] [3]` line under the
	// Section would say the same placement twice.
	it('leaves the placed-References line off a Section', () => {
		expect(at(nodes, 'n:b').referenceNumbers).toEqual([])
	})

	it('leaves an unplaced Reference off the map', () => {
		expect(nodes.some((node) => node.key === 'r:r2')).toBe(false)
	})
})

describe('the recursive shape', () => {
	const { nodes } = nested([makeNode({ id: 'a', children: [makeNode({ id: 'a1' })] })], {
		references: [makeReference({ id: 'r1', nodeId: 'a', text: 'A passage' })],
	})

	it('hangs the Sections nested inside a Section off it', () => {
		expect(nodes.map((node) => node.key)).toEqual(['root', 'n:a', 'n:a1'])
	})

	// Nothing draws the Reference here, so the Section says where it sits.
	it('says which References are placed at a Section instead', () => {
		expect(at(nodes, 'n:a').referenceNumbers).toEqual([1])
		expect(at(nodes, 'n:a').height).toBe(48 + 16)
	})
})

describe('where the boxes sit', () => {
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

	// The height a box takes is what a fixed-size tree layout cannot state, so
	// the layout asks for it per box rather than assuming one number.
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
		{ branches: 'sections', heightOf: ({ depth }) => (depth === 1 ? 100 : 44) },
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
	// Subtrees of different shapes, so the check meets a short one next to a
	// tall one in both orders.
	const { nodes } = mapOf(
		[
			makeNode({ id: 'a' }),
			makeNode({ id: 'b', intent: 'A note, which makes this box taller' }),
			makeNode({ id: 'c' }),
			makeNode({ id: 'd' }),
		],
		{
			references: [
				makeReference({ id: 'r1', nodeId: 'b', text: 'One' }),
				makeReference({ id: 'r2', nodeId: 'b', text: 'Two' }),
				makeReference({ id: 'r3', nodeId: 'b', text: 'Three' }),
				makeReference({ id: 'r4', nodeId: 'c', text: 'Four' }),
			],
		},
	)

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

describe('a folded Section', () => {
	const { nodes } = mapOf([makeNode({ id: 'a' })], {
		references: [
			makeReference({ id: 'r1', nodeId: 'a', text: 'One' }),
			makeReference({ id: 'r2', nodeId: 'a', text: 'Two' }),
		],
	})

	const folded = planMap(
		makePlan({
			outline: [makeNode({ id: 'a' })],
			references: [
				makeReference({ id: 'r1', nodeId: 'a', text: 'One' }),
				makeReference({ id: 'r2', nodeId: 'a', text: 'Two' }),
			],
		}),
		{ collapsed: new Set(['a']) },
	)

	it('leaves its children undrawn', () => {
		expect(nodes).toHaveLength(4)
		expect(folded.nodes.map((node) => node.key)).toEqual(['root', 'n:a'])
		expect(folded.links).toHaveLength(1)
	})

	// The box says how much is folded away, so the writer knows there is
	// something to open rather than reading a leaf.
	it('still says how many children it holds', () => {
		expect(at(folded.nodes, 'n:a').childCount).toBe(2)
		expect(at(folded.nodes, 'n:a').collapsed).toBe(true)
	})
})

describe('the path back to the root', () => {
	const { nodes } = mapOf([makeNode({ id: 'a' })], {
		references: [makeReference({ id: 'r1', nodeId: 'a', text: 'One' })],
	})

	it('lists every ancestor, nearest first', () => {
		expect(at(nodes, 'r:r1').ancestors).toEqual(['n:a', 'root'])
		expect(at(nodes, 'n:a').ancestors).toEqual(['root'])
		expect(at(nodes, 'root').ancestors).toEqual([])
	})
})

describe('what a box stands for', () => {
	it('gives back the Plan id, and nothing at the title', () => {
		const { nodes } = mapOf([makeNode({ id: 'a' })], {
			references: [makeReference({ id: 'r1', nodeId: 'a', text: 'One' })],
		})

		expect(subjectId(at(nodes, 'root').subject)).toBeNull()
		expect(subjectId(at(nodes, 'n:a').subject)).toBe('a')
		expect(subjectId(at(nodes, 'r:r1').subject)).toBe('r1')
	})
})

describe('the curve between two boxes', () => {
	const parent: MapNode = {
		key: 'root',
		parentKey: null,
		subject: { kind: 'article' },
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
		const { nodes, width, height } = mapOf(
			[makeNode({ id: 'a' }), makeNode({ id: 'b' })],
			{
				references: [makeReference({ id: 'r1', nodeId: 'a', text: 'One' })],
			},
		)

		expect(width).toBe(COLUMN * 2 + NODE)
		expect(height).toBe(Math.max(...nodes.map((node) => node.y + node.height)))
	})
})
