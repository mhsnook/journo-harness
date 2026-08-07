import { describe, expect, it } from 'vitest'

import type { Plan, ProposalInput } from '../../src/shared/plan'
import { applyProposal } from '../../src/shared/plan'
import { makeNode, makePlan, makeReference } from './plan-fixtures'

const plan = makePlan({
	title: 'The raid',
	totalTarget: 2000,
	voice: 'reported feature',
	adjectives: ['funny'],
	outline: [
		makeNode({ id: 'n1', title: 'Opening', intent: 'Open on the raid', target: 400 }),
		makeNode({
			id: 'n2',
			title: 'Middle',
			voice: 'academic',
			adjectives: ['somber'],
			children: [makeNode({ id: 'n2a' }), makeNode({ id: 'n2b' })],
		}),
		makeNode({ id: 'n3', title: 'Close' }),
	],
	references: [
		makeReference({ id: 'r1', text: 'A pulled passage', nodeId: 'n2a' }),
		makeReference({ id: 'r2', text: 'An unplaced passage', nodeId: null }),
		makeReference({ id: 'r3', text: 'A passage about the middle', nodeId: 'n2' }),
	],
})

/** The Plan a Proposal produced, or a failed assertion naming the refusal. */
function applied(proposal: ProposalInput, to: Plan = plan): Plan {
	const result = applyProposal(to, proposal)
	if (!result.ok) throw new Error(`Refused: ${result.refusal.message}`)

	return result.plan
}

/** The refusal a Proposal produced, or a failed assertion. */
function refused(proposal: ProposalInput, to: Plan = plan) {
	const result = applyProposal(to, proposal)
	if (result.ok) throw new Error('The Proposal applied, and the test expected a refusal.')

	return result.refusal
}

const ids = (nodes: { id: string }[]) => nodes.map((node) => node.id)

describe('applying a Proposal', () => {
	it('applies every op in one Proposal', () => {
		const next = applied([
			{
				op: 'createNode',
				parentId: null,
				beforeId: 'n3',
				node: makeNode({ id: 'n4', title: 'A turn', intent: 'Turn on the memo' }),
			},
			{ op: 'setTarget', nodeId: 'n4', expected: null, value: 400 },
			{
				op: 'setTitle',
				nodeId: null,
				expected: 'The raid',
				value: 'The raid, revisited',
			},
		])

		expect(ids(next.outline)).toEqual(['n1', 'n2', 'n4', 'n3'])
		expect(next.outline[2].target).toBe(400)
		expect(next.title).toBe('The raid, revisited')
	})

	it('refuses the whole Proposal when one expected fails, and applies nothing', () => {
		const refusal = refused([
			{
				op: 'createNode',
				parentId: null,
				beforeId: null,
				node: makeNode({ id: 'n4', title: 'A turn' }),
			},
			{
				op: 'setIntent',
				nodeId: 'n1',
				expected: 'Open on the dawn raid',
				value: 'Open colder',
			},
		])

		expect(refusal.type).toBe('stale')
		expect(refusal.index).toBe(1)
		expect(refusal.op).toBe('setIntent')
		expect(refusal.expected).toBe('Open on the dawn raid')
		expect(refusal.found).toBe('Open on the raid')
		expect(refusal.message).toContain('node n1')
	})

	it('never touches the Plan it is given', () => {
		const before = structuredClone(plan)
		applied([{ op: 'deleteNode', nodeId: 'n2' }])
		refused([{ op: 'deleteNode', nodeId: 'gone' }])

		expect(plan).toEqual(before)
	})

	it('applies an insert whose anchor survived an unrelated sibling being deleted', () => {
		const withoutN2 = applied([{ op: 'deleteNode', nodeId: 'n2' }])
		const insert: ProposalInput = [
			{
				op: 'createNode',
				parentId: null,
				beforeId: 'n3',
				node: makeNode({ id: 'n4', title: 'A turn' }),
			},
		]

		expect(ids(applied(insert, withoutN2).outline)).toEqual(['n1', 'n4', 'n3'])
	})

	it('refuses an insert whose own anchor is gone, and names it', () => {
		const withoutN2 = applied([{ op: 'deleteNode', nodeId: 'n2' }])
		const refusal = refused(
			[
				{
					op: 'createNode',
					parentId: null,
					afterId: 'n2',
					node: makeNode({ id: 'n4', title: 'A turn' }),
				},
			],
			withoutN2,
		)

		expect(refusal.type).toBe('missing')
		expect(refusal.op).toBe('createNode')
		expect(refusal.message).toContain('after n2')
	})

	it('refuses a Proposal that does not match the vocabulary', () => {
		const refusal = refused([{ op: 'setTone', nodeId: 'n1' }] as unknown as ProposalInput)

		expect(refusal.type).toBe('malformed')
		expect(refusal.index).toBe(0)
	})

	it('refuses rather than hand the Article Agent a Plan it would reject', () => {
		const broken = makePlan({
			references: [makeReference({ id: 'r1', text: 'A passage', nodeId: 'gone' })],
		})
		const refusal = refused(
			[{ op: 'setTitle', nodeId: null, expected: 'The article', value: 'A title' }],
			broken,
		)

		expect(refusal.type).toBe('invalid')
		expect(refusal.message).toContain('references.0.nodeId')
	})
})

describe('the structural ops', () => {
	it('inserts first when afterId is null, and last when beforeId is null', () => {
		const first = applied([
			{
				op: 'createNode',
				parentId: 'n2',
				afterId: null,
				node: makeNode({ id: 'n2z', title: 'First' }),
			},
			{
				op: 'createNode',
				parentId: 'n2',
				beforeId: null,
				node: makeNode({ id: 'n2y', title: 'Last' }),
			},
		])

		expect(ids(first.outline[1].children)).toEqual(['n2z', 'n2a', 'n2b', 'n2y'])
	})

	it('takes a payload that leaves out children, and stores the Plan spelling', () => {
		const next = applied([
			{
				op: 'createNode',
				parentId: null,
				beforeId: null,
				node: { id: 'n4', title: 'A turn' },
			},
		])

		expect(next.outline[3].children).toEqual([])
	})

	it('takes a payload stating an empty Adjectives list, and stores it as absent', () => {
		const next = applied([
			{
				op: 'createNode',
				parentId: null,
				beforeId: null,
				node: {
					id: 'n4',
					title: 'A turn',
					adjectives: [],
					children: [{ id: 'n4a', title: 'Its first part', adjectives: [] }],
				},
			},
		])

		expect(next.outline[3].adjectives).toBeUndefined()
		expect(next.outline[3].children[0].adjectives).toBeUndefined()
	})

	it('creates a subtree in one op', () => {
		const next = applied([
			{
				op: 'createNode',
				parentId: null,
				beforeId: null,
				node: makeNode({
					id: 'n4',
					title: 'A turn',
					children: [makeNode({ id: 'n4a', title: 'Its first part' })],
				}),
			},
		])

		expect(ids(next.outline[3].children)).toEqual(['n4a'])
	})

	it('refuses a created node carrying an id the Outline already carries', () => {
		const refusal = refused([
			{
				op: 'createNode',
				parentId: null,
				beforeId: null,
				node: makeNode({ id: 'n2a', title: 'A second n2a' }),
			},
		])

		expect(refusal.type).toBe('invalid')
		expect(refusal.message).toContain('n2a')
	})

	it('refuses an anchor that names a node under a different parent', () => {
		const refusal = refused([
			{
				op: 'createNode',
				parentId: 'n2',
				afterId: 'n3',
				node: makeNode({ id: 'n4', title: 'A turn' }),
			},
		])

		expect(refusal.type).toBe('missing')
		expect(refusal.message).toContain('node n2 does not carry')
	})

	it('moves a node with its subtree, and reorders among siblings', () => {
		const next = applied([
			{ op: 'moveNode', nodeId: 'n2', parentId: null, afterId: 'n3' },
		])

		expect(ids(next.outline)).toEqual(['n1', 'n3', 'n2'])
		expect(ids(next.outline[2].children)).toEqual(['n2a', 'n2b'])
	})

	it('moves a node under a new parent', () => {
		const next = applied([
			{ op: 'moveNode', nodeId: 'n3', parentId: 'n2', beforeId: 'n2b' },
		])

		expect(ids(next.outline)).toEqual(['n1', 'n2'])
		expect(ids(next.outline[1].children)).toEqual(['n2a', 'n3', 'n2b'])
	})

	it('refuses to anchor a move to the node being moved, and says so', () => {
		const refusal = refused([
			{ op: 'moveNode', nodeId: 'n2', parentId: null, afterId: 'n2' },
		])

		expect(refusal.type).toBe('invalid')
		expect(refusal.message).toContain('cannot anchor n2 to itself')
	})

	it('refuses to move a node under one it contains', () => {
		const refusal = refused([
			{ op: 'moveNode', nodeId: 'n2', parentId: 'n2a', beforeId: null },
		])

		expect(refusal.type).toBe('invalid')
		expect(refusal.message).toContain('a node it contains')
	})

	it('deletes a node with its subtree, and unplaces the References that sat there', () => {
		const next = applied([{ op: 'deleteNode', nodeId: 'n2' }])

		expect(ids(next.outline)).toEqual(['n1', 'n3'])
		expect(next.references.map((reference) => reference.nodeId)).toEqual([
			null,
			null,
			null,
		])
	})

	it('merges a node into another, moving its children and its References', () => {
		const next = applied([{ op: 'mergeNodes', nodeId: 'n2', intoId: 'n3' }])

		expect(ids(next.outline)).toEqual(['n1', 'n3'])
		expect(next.outline.map((node) => node.title)).toEqual(['Opening', 'Close'])
		expect(ids(next.outline[1].children)).toEqual(['n2a', 'n2b'])
		expect(next.references.map((reference) => reference.nodeId)).toEqual([
			'n2a',
			null,
			'n3',
		])
	})

	it('merges a child into its own parent, lifting what it held', () => {
		const next = applied([{ op: 'mergeNodes', nodeId: 'n2a', intoId: 'n2' }])

		expect(ids(next.outline[1].children)).toEqual(['n2b'])
		expect(next.references.map((reference) => reference.nodeId)).toEqual([
			'n2',
			null,
			'n2',
		])
	})

	it('refuses to merge a node into one it contains', () => {
		const refusal = refused([{ op: 'mergeNodes', nodeId: 'n2', intoId: 'n2b' }])

		expect(refusal.type).toBe('invalid')
		expect(refusal.message).toContain('which it contains')
	})
})

describe('the content ops', () => {
	it('sets the Article total and one node target from the same op', () => {
		const next = applied([
			{ op: 'setTarget', nodeId: null, expected: 2000, value: 2400 },
			{ op: 'setTarget', nodeId: 'n1', expected: 400, value: 600 },
		])

		expect(next.totalTarget).toBe(2400)
		expect(next.outline[0].target).toBe(600)
	})

	it('clears a field the Plan states, and states one it does not', () => {
		const next = applied([
			{ op: 'setVoice', nodeId: 'n2', expected: 'academic', value: null },
			{ op: 'setVoice', nodeId: 'n1', expected: null, value: 'plain' },
			{ op: 'setIntent', nodeId: 'n1', expected: 'Open on the raid', value: null },
		])

		expect(next.outline[1].voice).toBeUndefined()
		expect(next.outline[0].voice).toBe('plain')
		expect(next.outline[0].intent).toBeUndefined()
	})

	it('reads a node that states no Adjectives as the empty list', () => {
		const next = applied([
			{ op: 'setAdjectives', nodeId: 'n1', expected: [], value: ['high energy'] },
			{ op: 'setAdjectives', nodeId: 'n2', expected: ['somber'], value: [] },
			{
				op: 'setAdjectives',
				nodeId: null,
				expected: ['funny'],
				value: ['funny', 'warm'],
			},
		])

		expect(next.outline[0].adjectives).toEqual(['high energy'])
		expect(next.outline[1].adjectives).toBeUndefined()
		expect(next.adjectives).toEqual(['funny', 'warm'])
	})

	it('compares a list whole, so one term out of order is stale', () => {
		const refusal = refused([
			{ op: 'setAdjectives', nodeId: null, expected: ['warm', 'funny'], value: [] },
		])

		expect(refusal.type).toBe('stale')
		expect(refusal.found).toEqual(['funny'])
	})

	it('places a Reference, and unplaces one', () => {
		const next = applied([
			{ op: 'placeReference', referenceId: 'r2', expected: null, value: 'n1' },
			{ op: 'placeReference', referenceId: 'r1', expected: 'n2a', value: null },
		])

		expect(next.references.map((reference) => reference.nodeId)).toEqual([
			null,
			'n1',
			'n2',
		])
	})

	it('refuses to place a Reference at a node the Plan does not carry', () => {
		const refusal = refused([
			{ op: 'placeReference', referenceId: 'r2', expected: null, value: 'gone' },
		])

		expect(refusal.type).toBe('missing')
		expect(refusal.message).toContain('node gone')
	})

	it('refuses a Reference whose placement has moved since the Proposal', () => {
		const refusal = refused([
			{ op: 'placeReference', referenceId: 'r1', expected: null, value: 'n1' },
		])

		expect(refusal.type).toBe('stale')
		expect(refusal.found).toBe('n2a')
	})

	it('takes a Reference the writer wrote themselves, placed or not', () => {
		const next = applied([
			{
				op: 'createReference',
				reference: {
					id: 'r4',
					type: 'quote',
					provenance: { type: 'writer' },
					text: 'A passage they pasted in',
					source: { title: 'The memo', year: 2024 },
					nodeId: 'n1',
				},
			},
		])

		expect(next.references).toHaveLength(4)
		expect(next.references[3].provenance).toEqual({ type: 'writer' })
		expect(next.references[3].nodeId).toBe('n1')
	})

	it('refuses a Reference placed at a node the Plan does not carry', () => {
		const refusal = refused([
			{
				op: 'createReference',
				reference: {
					id: 'r4',
					type: 'reference',
					provenance: { type: 'writer' },
					source: { title: 'The memo' },
					nodeId: 'gone',
				},
			},
		])

		expect(refusal.type).toBe('missing')
		expect(refusal.message).toContain('node gone')
	})

	it('refuses a Reference carrying an id the Plan already holds', () => {
		const refusal = refused([
			{
				op: 'createReference',
				reference: {
					id: 'r1',
					type: 'reference',
					provenance: { type: 'writer' },
					source: { title: 'The memo' },
					nodeId: null,
				},
			},
		])

		expect(refusal.type).toBe('invalid')
		expect(refusal.message).toContain('two References')
	})

	it('replaces what a Reference says, and keeps what identifies it', () => {
		const next = applied([
			{
				op: 'setReference',
				referenceId: 'r1',
				expected: { type: 'reference', text: 'A pulled passage' },
				value: {
					type: 'quote',
					text: 'A pulled passage, corrected',
					source: { author: 'R. Okonkwo' },
				},
			},
		])

		expect(next.references[0]).toEqual({
			id: 'r1',
			type: 'quote',
			provenance: { type: 'writer' },
			text: 'A pulled passage, corrected',
			source: { author: 'R. Okonkwo' },
			nodeId: 'n2a',
		})
	})

	it('drops a field the new content leaves out', () => {
		const noted = applied([
			{
				op: 'setReference',
				referenceId: 'r2',
				expected: { type: 'reference', text: 'An unplaced passage' },
				value: { type: 'reference', text: 'An unplaced passage', note: 'Worth a look' },
			},
		])
		const next = applied(
			[
				{
					op: 'setReference',
					referenceId: 'r2',
					expected: {
						type: 'reference',
						text: 'An unplaced passage',
						note: 'Worth a look',
					},
					value: { type: 'reference', text: 'An unplaced passage' },
				},
			],
			noted,
		)

		expect('note' in next.references[1]).toBe(false)
	})

	it('compares a Reference key by key, so one changed field is stale', () => {
		const refusal = refused([
			{
				op: 'setReference',
				referenceId: 'r1',
				expected: { type: 'reference', text: 'A pulled passage', note: 'Never said' },
				value: { type: 'reference', text: 'Something else' },
			},
		])

		expect(refusal.type).toBe('stale')
		expect(refusal.found).toEqual({ type: 'reference', text: 'A pulled passage' })
	})

	it('deletes a Reference and leaves the rest', () => {
		const next = applied([{ op: 'deleteReference', referenceId: 'r2' }])

		expect(next.references.map((reference) => reference.id)).toEqual(['r1', 'r3'])
	})

	it('refuses to delete a Reference the Plan does not carry', () => {
		const refusal = refused([{ op: 'deleteReference', referenceId: 'gone' }])

		expect(refusal.type).toBe('missing')
		expect(refusal.message).toContain('Reference gone')
	})

	it('refuses a content op naming a node the Plan does not carry', () => {
		const refusal = refused([
			{ op: 'setTitle', nodeId: 'gone', expected: '', value: 'A title' },
		])

		expect(refusal.type).toBe('missing')
		expect(refusal.op).toBe('setTitle')
		expect(refusal.message).toContain('node gone')
	})
})
