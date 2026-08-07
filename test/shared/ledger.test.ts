import { describe, expect, it } from 'vitest'

import {
	offerLedger,
	referenceForOffer,
	referenceFromOffer,
} from '../../src/shared/ledger'
import type { Offer } from '../../src/shared/offer'
import { offerFingerprint } from '../../src/shared/offer'
import type { ReferenceContent } from '../../src/shared/plan'
import { referenceSchema } from '../../src/shared/plan'
import { makeNode, makePlan, makeReference } from './plan-fixtures'

/** An Offer as the Article Agent hands it back. */
function makeOffer(offer: Partial<Offer> & { id: string }): Offer {
	return {
		type: 'link',
		source: { title: `Source ${offer.id}` },
		disposition: 'undecided',
		createdAt: 0,
		decidedAt: null,
		...offer,
	}
}

const plan = makePlan({
	outline: [
		makeNode({ id: 'n1', title: 'The year the cranes stopped' }),
		makeNode({ id: 'n2', title: 'How review became the process' }),
	],
})

describe('the Reference an Accepted Offer becomes', () => {
	it('carries the content and the Provenance, unplaced', () => {
		const offer = makeOffer({
			id: 'o1',
			type: 'quote',
			text: 'We did not decide to stop building.',
			source: { title: 'Permit throughput', year: 2023 },
			note: 'Opens §2 well.',
			disposition: 'accepted',
		})

		expect(referenceFromOffer(offer, 'r1')).toEqual({
			id: 'r1',
			type: 'quote',
			provenance: { type: 'offer', offerId: 'o1' },
			nodeId: null,
			text: 'We did not decide to stop building.',
			source: { title: 'Permit throughput', year: 2023 },
			note: 'Opens §2 well.',
		})
	})

	// True by construction, and what catches a field added to one side.
	it('parses as a Reference', () => {
		const offer = makeOffer({ id: 'o1', type: 'quote', text: 'Forty separate times.' })

		expect(referenceSchema.safeParse(referenceFromOffer(offer, 'r1')).success).toBe(true)
	})

	it('says "nothing here" by leaving the key out', () => {
		const offer = makeOffer({ id: 'o1', source: { title: 'Housing starts' } })

		expect(Object.keys(referenceFromOffer(offer, 'r1')).sort()).toEqual([
			'id',
			'nodeId',
			'provenance',
			'source',
			'type',
		])
	})
})

describe('finding the Plan copy of an Offer', () => {
	const accepted = makePlan({
		references: [
			makeReference({
				id: 'r1',
				source: { title: 'Permit throughput in six mid-sized cities' },
				provenance: { type: 'offer', offerId: 'o1' },
			}),
		],
	})

	it('follows the Provenance', () => {
		expect(referenceForOffer(accepted, 'o1')?.id).toBe('r1')
		expect(referenceForOffer(accepted, 'o2')).toBeUndefined()
	})

	// The writer owns the copy, so content stops matching.
	it('finds it after the writer has edited the copy past recognition', () => {
		const edited = {
			...accepted,
			references: accepted.references.map((reference) => ({
				...reference,
				source: { title: 'Okonkwo on permit queues' },
			})),
		}

		expect(referenceForOffer(edited, 'o1')?.id).toBe('r1')
	})
})

describe('reading the Offer ledger', () => {
	const offers = [
		makeOffer({ id: 'o1', disposition: 'accepted' }),
		makeOffer({ id: 'o2', disposition: 'accepted' }),
		makeOffer({ id: 'o3' }),
		makeOffer({ id: 'o4', disposition: 'declined' }),
		makeOffer({ id: 'o5', disposition: 'declined' }),
	]

	const held = makePlan({
		outline: plan.outline,
		references: [
			makeReference({
				id: 'r1',
				text: 'Forty separate times.',
				nodeId: 'n2',
				provenance: { type: 'offer', offerId: 'o1' },
			}),
			makeReference({
				id: 'r2',
				text: 'Every objection was reasonable.',
				provenance: { type: 'offer', offerId: 'o2' },
			}),
			makeReference({ id: 'r3', source: { title: 'The writer typed this one' } }),
		],
	})

	it('counts each disposition, and the whole list', () => {
		const ledger = offerLedger(offers)

		expect(ledger.counts).toEqual({ all: 5, undecided: 1, accepted: 2, declined: 2 })
		expect(ledger.byDisposition.declined.map((offer) => offer.id)).toEqual(['o4', 'o5'])
	})

	// The Ledger belongs to the Chat Panel, so what the Plan holds — `r3`, which
	// the writer typed, and `r2`, which sits at no Section — never reaches it.
	it('reads the Offers alone, whatever the Plan holds', () => {
		expect(held.references).toHaveLength(3)
		expect(offerLedger(offers).counts.all).toBe(5)
	})

	it('reads an Article with no Offers as an empty Ledger', () => {
		const ledger = offerLedger([])

		expect(ledger.counts).toEqual({ all: 0, undecided: 0, accepted: 0, declined: 0 })
		expect(ledger.offers).toEqual([])
	})
})

describe('the fingerprint a re-offer is recognised by', () => {
	const content: ReferenceContent = {
		type: 'link',
		source: {
			title: 'Permit throughput in six mid-sized cities',
			author: 'R. Okonkwo',
			year: 2023,
			url: 'https://quarterly.example/permit-throughput',
		},
	}

	it('matches the same source turned up again, whitespace and case aside', () => {
		const again: ReferenceContent = {
			...content,
			source: {
				...content.source,
				title: '  Permit Throughput in Six Mid-Sized Cities ',
			},
		}

		expect(offerFingerprint(again)).toBe(offerFingerprint(content))
	})

	// Written fresh each session, and not about which source this is.
	it('ignores the note', () => {
		expect(offerFingerprint({ ...content, note: 'Primary data.' })).toBe(
			offerFingerprint(content),
		)
	})

	// Offers are flat, and a url alone would fold these into one.
	it('separates two Quotes pulled from one source', () => {
		const first: ReferenceContent = {
			...content,
			type: 'quote',
			text: 'Forty separate times.',
		}
		const second: ReferenceContent = { ...first, text: 'The meter runs on an empty lot.' }

		expect(offerFingerprint(second)).not.toBe(offerFingerprint(first))
	})

	it('separates a Quote from the Link carrying the same text', () => {
		const quote: ReferenceContent = {
			...content,
			type: 'quote',
			text: 'Forty separate times.',
		}

		expect(offerFingerprint({ ...quote, type: 'link' })).not.toBe(offerFingerprint(quote))
	})
})
