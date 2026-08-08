import { describe, expect, it } from 'vitest'

import { acceptOffer } from '../../src/client/plan/edits'
import { createPlanWriter } from '../../src/client/plan/writer'
import type { Offer } from '../../src/shared/offer'
import type { Plan } from '../../src/shared/plan'
import { applyProposal } from '../../src/shared/plan'
import { makeNode, makePlan } from '../shared/plan-fixtures'

/** Accepting, as the op the Ledger sends through the applier. */

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

	// A double click, or the retry of an Accept whose ruling did not land.
	it('is not an edit at all once the Plan holds a copy', () => {
		const result = applyProposal(plan, acceptOffer(plan, offer, 'r1'))
		if (!result.ok) throw new Error(result.refusal.message)

		expect(acceptOffer(result.plan, offer, 'r2')).toBeNull()
	})

	// The writer owns the copy, so content stops matching.
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

/**
 * The op is built after a round trip, so the handler's Plan is older than the
 * writer's. The builder form is what reads the current one.
 */
describe('Accepting twice before the first write lands', () => {
	function writerOn(start: Plan) {
		const writer = createPlanWriter({ send: () => {}, onPlan: () => {} })
		writer.receive(start)

		return writer
	}

	it('copies the Offer once when the edit is built against the held Plan', () => {
		const writer = writerOn(plan)

		// Both bound against `plan`, which carries no copy.
		writer.edit((held) => acceptOffer(held, offer))
		writer.edit((held) => acceptOffer(held, offer))

		expect(writer.plan?.references).toHaveLength(1)
	})

	// The backstop, which does not depend on the client asking well.
	it('is refused by the applier when the ops are built against a stale Plan', () => {
		const writer = writerOn(plan)
		const stale = acceptOffer(plan, offer, 'r1')
		const alsoStale = acceptOffer(plan, offer, 'r2')

		expect(writer.edit(stale)).toBeNull()
		expect(writer.edit(alsoStale)?.type).toBe('invalid')
		expect(writer.plan?.references).toHaveLength(1)
	})
})
