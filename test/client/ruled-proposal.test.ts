import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { ProposalCall } from '../../src/client/chat/proposals'
import { RuledProposal } from '../../src/client/chat/RuledProposal'
import type { Plan } from '../../src/shared/plan'
import { makePlan } from '../shared/plan-fixtures'

/**
 * What a ruled Proposal keeps. The note used to say "Proposal Accepted." and
 * nothing else, so the writer could not read back what they had agreed to.
 */

const plan: Plan = makePlan({
	outline: [{ id: 'sec-cost', title: 'Who actually pays', children: [] }],
})

const call: ProposalCall = {
	toolCallId: 'call-1',
	ops: [{ op: 'setTarget', nodeId: 'sec-cost', expected: null, value: 700 }],
	unreadable: null,
}

function ruled(ruling: 'accepted' | 'declined', held: ProposalCall = call) {
	return renderToStaticMarkup(createElement(RuledProposal, { call: held, plan, ruling }))
}

describe('a Proposal the writer has ruled on', () => {
	it('carries the changes it was presented with, under the ruling', () => {
		const html = ruled('accepted')

		expect(html).toContain('Proposal Accepted')
		expect(html).toContain('Set the length of §1 Who actually pays to 700 words.')
	})

	it('keeps the changes a Decline sent back', () => {
		const html = ruled('declined')

		expect(html).toContain('Proposal Declined')
		expect(html).toContain('Set the length of §1 Who actually pays to 700 words.')
	})

	// A record, so it stays out of the way until the writer asks for it.
	it('folds shut, and expands', () => {
		const html = ruled('accepted')

		expect(html).toContain('<details')
		expect(html).toContain('<summary')
		expect(html).not.toContain('open=""')
	})

	it('counts the changes on the line the writer reads before expanding', () => {
		expect(ruled('accepted')).toContain('1 change')
		expect(
			ruled('accepted', {
				...call,
				ops: [
					{ op: 'setTarget', nodeId: 'sec-cost', expected: null, value: 700 },
					{
						op: 'setTitle',
						nodeId: 'sec-cost',
						expected: 'Who actually pays',
						value: 'Who pays',
					},
				],
			}),
		).toContain('2 changes')
	})

	// The count would read "0 changes", which is not what happened.
	it('says why instead where the payload never parsed, and counts nothing', () => {
		const html = ruled('declined', {
			toolCallId: 'call-1',
			ops: null,
			unreadable: 'ops: expected array',
		})

		expect(html).toContain('>Proposal Declined.</summary>')
		expect(html).not.toContain('0 changes')
		expect(html).toContain('could not be read')
	})
})
