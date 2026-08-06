import { describe, expect, it } from 'vitest'

import { emptyPlan, planSchema, referenceSchema, sourceSchema } from '../src/plan'
import { makeNode, makePlan, makeReference } from './plan-fixtures'

/** The path of the first issue, joined — what the UI would point at. */
function firstIssuePath(result: {
	success: boolean
	error?: { issues: { path: PropertyKey[] }[] }
}) {
	return result.error?.issues[0]?.path.join('.')
}

describe('the Plan schema', () => {
	it('accepts the empty Plan a new Article opens into', () => {
		expect(planSchema.safeParse(emptyPlan()).success).toBe(true)
	})

	it('accepts a Plan with a nested Outline and a placed Reference', () => {
		const plan = makePlan({
			totalTarget: 2000,
			voice: 'reported feature',
			adjectives: ['funny'],
			outline: [
				makeNode({
					id: 'n1',
					target: 800,
					children: [makeNode({ id: 'n1a', intent: 'Set the scene' })],
				}),
				makeNode({ id: 'n2' }),
			],
			references: [makeReference({ id: 'r1', nodeId: 'n1a' })],
		})

		expect(planSchema.safeParse(plan).success).toBe(true)
	})

	it('rejects an unknown key, because only the client writes the blob', () => {
		const plan = { ...emptyPlan(), resolvedVoice: 'reported feature' }

		expect(planSchema.safeParse(plan).success).toBe(false)
	})

	it('rejects a missing totalTarget, and accepts a stated null', () => {
		const { totalTarget: _omitted, ...withoutTotal } = emptyPlan()

		expect(planSchema.safeParse(withoutTotal).success).toBe(false)
		expect(planSchema.safeParse({ ...withoutTotal, totalTarget: null }).success).toBe(
			true,
		)
	})

	it('rejects a word-count target that is not a positive whole number', () => {
		expect(planSchema.safeParse(makePlan({ totalTarget: 0 })).success).toBe(false)
		expect(planSchema.safeParse(makePlan({ totalTarget: -400 })).success).toBe(false)
		expect(planSchema.safeParse(makePlan({ totalTarget: 1200.5 })).success).toBe(false)
	})

	it('rejects an empty Voice or Adjective, which are absence spelled twice', () => {
		expect(planSchema.safeParse(makePlan({ voice: '' })).success).toBe(false)
		expect(planSchema.safeParse(makePlan({ adjectives: [''] })).success).toBe(false)
	})

	it('accepts an Outline node with an empty title, because one is typed after it is made', () => {
		const plan = makePlan({ outline: [makeNode({ id: 'n1', title: '' })] })

		expect(planSchema.safeParse(plan).success).toBe(true)
	})

	it('rejects an Outline node with no id', () => {
		const plan = makePlan({ outline: [makeNode({ id: '' })] })

		expect(planSchema.safeParse(plan).success).toBe(false)
	})

	it('rejects two Outline nodes carrying one id, however deep', () => {
		const plan = makePlan({
			outline: [
				makeNode({ id: 'n1', children: [makeNode({ id: 'shared' })] }),
				makeNode({ id: 'shared' }),
			],
		})
		const result = planSchema.safeParse(plan)

		expect(result.success).toBe(false)
		expect(firstIssuePath(result)).toBe('outline.1.id')
	})

	it('rejects two References carrying one id', () => {
		const plan = makePlan({
			references: [makeReference({ id: 'r1' }), makeReference({ id: 'r1' })],
		})
		const result = planSchema.safeParse(plan)

		expect(result.success).toBe(false)
		expect(firstIssuePath(result)).toBe('references.1.id')
	})

	it('rejects a Reference placed at an Outline node that is not there', () => {
		const plan = makePlan({
			outline: [makeNode({ id: 'n1' })],
			references: [makeReference({ id: 'r1', nodeId: 'gone' })],
		})
		const result = planSchema.safeParse(plan)

		expect(result.success).toBe(false)
		expect(firstIssuePath(result)).toBe('references.0.nodeId')
	})
})

describe('the Reference invariant', () => {
	const base = { id: 'r1', provenance: { kind: 'writer' as const }, nodeId: null }

	it('accepts a Reference carrying only a text — which is a Quote', () => {
		const result = referenceSchema.safeParse({ ...base, text: 'They knew by March.' })

		expect(result.success).toBe(true)
	})

	it('accepts a Reference carrying only a source', () => {
		const result = referenceSchema.safeParse({
			...base,
			source: { publication: 'The Guardian', year: 2024 },
		})

		expect(result.success).toBe(true)
	})

	it('accepts a Reference carrying both', () => {
		const result = referenceSchema.safeParse({
			...base,
			text: 'They knew by March.',
			source: { author: 'A. Reporter', url: 'https://example.test/piece' },
		})

		expect(result.success).toBe(true)
	})

	it('rejects a Reference carrying neither, because it is nothing', () => {
		expect(referenceSchema.safeParse(base).success).toBe(false)
	})

	it('rejects a source with every field absent, which is neither by another route', () => {
		expect(sourceSchema.safeParse({}).success).toBe(false)
		expect(referenceSchema.safeParse({ ...base, source: {} }).success).toBe(false)
	})

	it('rejects a Provenance that names an Offer without naming which', () => {
		const result = referenceSchema.safeParse({
			...base,
			text: 'They knew by March.',
			provenance: { kind: 'offer' },
		})

		expect(result.success).toBe(false)
	})

	it('accepts an Accepted Offer copied in with its Provenance', () => {
		const result = referenceSchema.safeParse({
			...base,
			text: 'They knew by March.',
			provenance: { kind: 'offer', offerId: 'o1' },
		})

		expect(result.success).toBe(true)
	})
})
