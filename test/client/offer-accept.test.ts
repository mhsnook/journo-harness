import { describe, expect, it } from 'vitest'

import { acceptOffer } from '../../src/client/plan/edits'
import type { Offer } from '../../src/shared/offer'
import { applyProposal } from '../../src/shared/plan'
import { makeNode, makePlan } from '../shared/plan-fixtures'

/**
 * Accepting an Offer, as the op the Ledger sends. It goes through the applier
 * like every other Plan edit, so what this checks is the op it builds and what
 * the applier makes of it.
 */

const offer: Offer = {
	id: 'o1',
	type: 'quote',
	text: 'We did not decide to stop building.',
	source: { title: 'Permit throughput in six mid-sized cities', year: 2023 },
	note: 'Opens §2 well.',
	disposition: 'accepted',
	createdAt: 0,
	decidedAt: 1,
}

const plan = makePlan({ outline: [makeNode({ id: 'n1', title: 'The opening' })] })

describe('Accepting an Offer into the Plan', () => {
	it('builds one createReference op carrying the Offer’s Provenance', () => {
		expect(acceptOffer(plan, offer, 'r1')).toEqual([
			{
				op: 'createReference',
				reference: {
					id: 'r1',
					type: 'quote',
					provenance: { type: 'offer', offerId: 'o1' },
					nodeId: null,
					text: offer.text,
					source: offer.source,
					note: offer.note,
				},
			},
		])
	})

	it('lands the Reference, unplaced', () => {
		const result = applyProposal(plan, acceptOffer(plan, offer, 'r1'))

		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(result.plan.references).toHaveLength(1)
		expect(result.plan.references[0]).toMatchObject({ id: 'r1', nodeId: null })
	})

	// The two writes Accepting makes are not atomic, so the second can be asked
	// for twice — by a double click, or by the re-add of a stranded Offer whose
	// Plan write turns out to have landed after all.
	it('is not an edit at all once the Plan holds a copy', () => {
		const result = applyProposal(plan, acceptOffer(plan, offer, 'r1'))
		if (!result.ok) throw new Error(result.refusal.message)

		expect(acceptOffer(result.plan, offer, 'r2')).toBeNull()
	})

	// Provenance is the pointer precisely so that editing the copy cannot hide it.
	it('still recognises the copy after the writer has edited it', () => {
		const accepted = applyProposal(plan, acceptOffer(plan, offer, 'r1'))
		if (!accepted.ok) throw new Error(accepted.refusal.message)

		const edited = {
			...accepted.plan,
			references: accepted.plan.references.map((reference) => ({
				...reference,
				text: 'We did not decide.',
				nodeId: 'n1',
			})),
		}

		expect(acceptOffer(edited, offer, 'r2')).toBeNull()
	})
})
