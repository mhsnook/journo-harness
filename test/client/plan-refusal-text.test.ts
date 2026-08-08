import { describe, expect, it } from 'vitest'

import { refusalText } from '../../src/client/plan/refusalText'
import { applyProposal, type Plan, type ProposalInput } from '../../src/shared/plan'
import { makePlan } from '../shared/plan-fixtures'

/**
 * What a refused edit reads as on screen, against what the same refusal says to
 * the model. Cases run the real applier rather than a hand-built `Refusal`, so a
 * reason code that stops being produced takes its test with it.
 */

const plan: Plan = makePlan({
	title: 'Why cities stopped building',
	totalTarget: 2400,
	outline: [
		{ id: 'sec-cranes', title: 'The year the cranes stopped', children: [] },
		{
			id: 'sec-cost',
			title: 'Who actually pays for the delay',
			target: 900,
			children: [{ id: 'sec-sub', title: 'The carrying cost', children: [] }],
		},
	],
	references: [
		{
			id: 'ref-meter',
			type: 'quote',
			provenance: { type: 'writer' },
			text: 'The meter runs on an empty lot.',
			nodeId: null,
		},
	],
})

/** The refusal the applier produces, which is the one the Panel renders. */
function refuse(ops: ProposalInput, against: Plan = plan) {
	const result = applyProposal(against, ops)
	if (result.ok) throw new Error('These ops were meant to be refused.')

	return result.refusal
}

function reads(ops: ProposalInput, against: Plan = plan): string {
	return refusalText(against, refuse(ops, against))
}

describe('what the writer reads', () => {
	it('names the Section the way the Outline numbers it, and quotes both values', () => {
		expect(
			reads([
				{ op: 'setTitle', nodeId: 'sec-cost', expected: 'Who pays', value: 'Who pays' },
			]),
		).toBe(
			'§2 has changed since the Chat proposed this. It now reads “Who actually pays for the delay”, where the change expected “Who pays”.',
		)
	})

	/** The full name of a Section is its number and its title, so a refused
	 * setTitle would otherwise print that title twice. */
	it('uses the bare number where the sentence goes on to quote the title', () => {
		const said = reads([
			{ op: 'setTitle', nodeId: 'sec-cost', expected: 'Who pays', value: 'x' },
		])

		expect(said.split('Who actually pays for the delay')).toHaveLength(2)
	})

	it('reads a null Scope as the Article', () => {
		expect(reads([{ op: 'setTarget', nodeId: null, expected: 100, value: 2000 }])).toBe(
			'The Article has changed since the Chat proposed this. It now reads 2400, where the change expected 100.',
		)
	})

	it('says "nothing" for a field the Plan does not carry, never "null"', () => {
		expect(
			reads([{ op: 'setVoice', nodeId: null, expected: 'Explainer', value: 'Wry' }]),
		).toContain('It now reads nothing, where the change expected “Explainer”.')
	})

	it('says an empty Adjectives list is nothing', () => {
		expect(
			reads([{ op: 'setAdjectives', nodeId: 'sec-cost', expected: ['wry'], value: [] }]),
		).toContain('It now reads nothing, where the change expected wry.')
	})

	/** There is no name to give a Section the Plan does not carry, so the
	 * sentence says it went rather than naming the fallback twice. */
	it('does not try to name a Section that is gone', () => {
		expect(reads([{ op: 'deleteNode', nodeId: 'sec-gone' }])).toBe(
			'That change is for a Section that is no longer in the Outline. Ask the Chat to look again.',
		)
	})

	it('names the Section an anchor was looked for in, which does exist', () => {
		expect(
			reads([
				{
					op: 'createNode',
					parentId: 'sec-cost',
					afterId: 'sec-gone',
					node: { id: 'sec-new', title: 'New', children: [] },
				},
			]),
		).toBe(
			'That change puts a Section next to one that is no longer in §2 Who actually pays for the delay.',
		)
	})

	it('does not try to name a Reference that is gone', () => {
		expect(reads([{ op: 'deleteReference', referenceId: 'ref-gone' }])).toContain(
			'no longer in the list',
		)
	})

	it('names a Section that is in the way of a move', () => {
		expect(
			reads([
				{ op: 'moveNode', nodeId: 'sec-cost', parentId: 'sec-sub', beforeId: null },
			]),
		).toBe(
			'That change moves §2 Who actually pays for the delay inside §2.1 The carrying cost, which sits inside it.',
		)
	})

	it('names the Section a duplicate id would collide with', () => {
		expect(
			reads([
				{
					op: 'createNode',
					parentId: null,
					beforeId: null,
					node: { id: 'sec-cranes', title: 'Again', children: [] },
				},
			]),
		).toBe(
			'That change adds §1 The year the cranes stopped, which the Plan already carries.',
		)
	})

	it('says a merge with itself plainly', () => {
		expect(reads([{ op: 'mergeNodes', nodeId: 'sec-cost', intoId: 'sec-cost' }])).toBe(
			'That change merges §2 Who actually pays for the delay into itself.',
		)
	})

	it('says an unreadable payload without repeating the schema at the writer', () => {
		expect(reads([{ op: 'setTitle' } as never])).toBe(
			'The Chat sent a change that could not be read. Ask it to try again.',
		)
	})
})

/** The other reader: a Declined Proposal sends `message` back, so it keeps the
 * op name and the ids the model proposed with. */
describe('what the model reads', () => {
	it('keeps the op name and the id the writer never saw', () => {
		const refusal = refuse([
			{ op: 'setTitle', nodeId: 'sec-cost', expected: 'Who pays', value: 'x' },
		])

		expect(refusal.message).toContain('setTitle')
		expect(refusal.message).toContain('sec-cost')
	})

	it('leaves both out of what the writer reads', () => {
		const said = reads([
			{ op: 'setTitle', nodeId: 'sec-cost', expected: 'Who pays', value: 'x' },
		])

		expect(said).not.toContain('setTitle')
		expect(said).not.toContain('sec-cost')
	})

	/** context.md fixes Section and Subsection for the writer; "node" belongs to
	 * the data model and may stay in the model's sentence. */
	it('never says "node" to the writer', () => {
		const everything = [
			reads([{ op: 'deleteNode', nodeId: 'sec-gone' }]),
			reads([{ op: 'setIntent', nodeId: 'sec-gone', expected: null, value: 'x' }]),
			reads([
				{ op: 'placeReference', referenceId: 'ref-gone', expected: null, value: null },
			]),
			reads([
				{ op: 'moveNode', nodeId: 'sec-cost', parentId: 'sec-sub', beforeId: null },
			]),
		]

		for (const said of everything) expect(said).not.toMatch(/node/i)
	})
})
