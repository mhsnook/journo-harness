import { describe, expect, it } from 'vitest'

import { nodeAllocation, planAllocation } from '../src/shared/plan'
import { makeNode, makePlan } from './plan-fixtures'

describe('word-count arithmetic', () => {
	it('reports unstated when the writer has not stated a total', () => {
		const plan = makePlan({ outline: [makeNode({ id: 'n1', target: 400 })] })

		expect(planAllocation(plan)).toEqual({
			total: null,
			allocated: 400,
			untargeted: 0,
			gap: null,
			status: 'unstated',
		})
	})

	it('reports the whole total as unallocated when the Outline is empty', () => {
		const plan = makePlan({ totalTarget: 2000 })

		expect(planAllocation(plan)).toEqual({
			total: 2000,
			allocated: 0,
			untargeted: 0,
			gap: 2000,
			status: 'unallocated',
		})
	})

	it('reports the whole total as unallocated when no node carries a target', () => {
		const plan = makePlan({ totalTarget: 2000, outline: [makeNode({ id: 'n1' })] })

		expect(planAllocation(plan)).toMatchObject({
			allocated: 0,
			gap: 2000,
			status: 'unallocated',
		})
	})

	it('reports unallocated while any node still carries no target', () => {
		const plan = makePlan({
			totalTarget: 2000,
			outline: [makeNode({ id: 'n1', target: 600 }), makeNode({ id: 'n2' })],
		})

		expect(planAllocation(plan)).toEqual({
			total: 2000,
			allocated: 600,
			untargeted: 1,
			gap: 1400,
			status: 'unallocated',
		})
	})

	it('reports under when every node carries a target and they still fall short', () => {
		const plan = makePlan({
			totalTarget: 2000,
			outline: [makeNode({ id: 'n1', target: 600 }), makeNode({ id: 'n2', target: 900 })],
		})

		expect(planAllocation(plan)).toMatchObject({
			untargeted: 0,
			gap: 500,
			status: 'under',
		})
	})

	it('reports over when the targets exceed the total', () => {
		const plan = makePlan({
			totalTarget: 2000,
			outline: [
				makeNode({ id: 'n1', target: 1600 }),
				makeNode({ id: 'n2', target: 700 }),
			],
		})

		expect(planAllocation(plan)).toMatchObject({ gap: -300, status: 'over' })
	})

	it('reports balanced when they meet exactly', () => {
		const plan = makePlan({
			totalTarget: 1000,
			outline: [makeNode({ id: 'n1', target: 400 }), makeNode({ id: 'n2', target: 600 })],
		})

		expect(planAllocation(plan)).toMatchObject({ gap: 0, status: 'balanced' })
	})

	it("counts a parent's target once, not again through its children", () => {
		const plan = makePlan({
			totalTarget: 2000,
			outline: [
				makeNode({
					id: 'n1',
					target: 800,
					children: [
						makeNode({ id: 'n1a', target: 500 }),
						makeNode({ id: 'n1b', target: 300 }),
					],
				}),
			],
		})

		expect(planAllocation(plan)).toMatchObject({ allocated: 800, gap: 1200 })
	})

	it("sums a parent's children when the parent carries no target of its own", () => {
		const plan = makePlan({
			totalTarget: 2000,
			outline: [
				makeNode({
					id: 'n1',
					children: [
						makeNode({ id: 'n1a', target: 500 }),
						makeNode({ id: 'n1b', target: 300 }),
					],
				}),
			],
		})

		expect(planAllocation(plan)).toMatchObject({
			allocated: 800,
			untargeted: 0,
			status: 'under',
		})
	})

	it('counts an untargeted leaf below an untargeted parent', () => {
		const plan = makePlan({
			totalTarget: 2000,
			outline: [
				makeNode({
					id: 'n1',
					children: [makeNode({ id: 'n1a', target: 500 }), makeNode({ id: 'n1b' })],
				}),
			],
		})

		expect(planAllocation(plan)).toMatchObject({ untargeted: 1, status: 'unallocated' })
	})

	it('distributes no remainder — an untargeted node keeps no target', () => {
		const plan = makePlan({
			totalTarget: 2000,
			outline: [makeNode({ id: 'n1', target: 600 }), makeNode({ id: 'n2' })],
		})
		const before = structuredClone(plan)
		planAllocation(plan)

		expect(plan).toEqual(before)
		expect(plan.outline[1]?.target).toBeUndefined()
	})

	it('measures one node against its own children', () => {
		const node = makeNode({
			id: 'n1',
			target: 800,
			children: [makeNode({ id: 'n1a', target: 500 }), makeNode({ id: 'n1b' })],
		})

		expect(nodeAllocation(node)).toEqual({
			total: 800,
			allocated: 500,
			untargeted: 1,
			gap: 300,
			status: 'unallocated',
		})
	})

	it("reports a leaf node's whole target as unallocated, having nothing below it", () => {
		expect(nodeAllocation(makeNode({ id: 'n1', target: 400 }))).toMatchObject({
			allocated: 0,
			gap: 400,
			status: 'unallocated',
		})
	})
})
