import { describe, expect, it } from 'vitest'

import { acceptIntoPlan, offerLedger, referenceForOffer } from '../../src/shared/ledger'
import type { Offer, OfferMaterial } from '../../src/shared/offer'
import { offerFingerprint, offerMaterialSchema } from '../../src/shared/offer'
import { referenceSchema } from '../../src/shared/plan'
import { makeNode, makePlan, makeReference } from './plan-fixtures'

/** An Offer as the Article Agent hands it back — the material the Chat turned
 * up, plus the row fields. */
function makeOffer(offer: Partial<Offer> & { id: string }): Offer {
	return {
		type: 'reference',
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
		makeNode({
			id: 'n2',
			title: 'How review became the process',
			children: [makeNode({ id: 'n2a', title: 'The eleven points' })],
		}),
	],
})

/**
 * Accepting maps an Offer's material onto a Reference's field by field, so the
 * two schemas have to agree about what that material is. They are built from
 * one `referenceMaterial` group; these are what would catch it if they stopped
 * being. Drift either way is silent otherwise — Accepting would drop a field or
 * be refused at the destination, and neither failure names the cause.
 */
describe('the two definitions of Reference material', () => {
	const material = {
		type: 'quote',
		text: 'We did not decide to stop building.',
		source: { title: 'Permit throughput', author: 'R. Okonkwo', year: 2023 },
		note: 'Opens §2 well.',
	}

	/** The same material, as a Reference: identity fields around it, nothing else. */
	const asReference = (record: object) => ({
		id: 'r1',
		provenance: { type: 'writer' },
		nodeId: null,
		...record,
	})

	it('takes every field the other takes', () => {
		expect(offerMaterialSchema.parse(material)).toEqual(material)
		expect(referenceSchema.parse(asReference(material))).toEqual(asReference(material))
	})

	it('refuses an entry carrying neither a text nor a source at both ends', () => {
		const empty = { type: 'reference' }

		expect(offerMaterialSchema.safeParse(empty).success).toBe(false)
		expect(referenceSchema.safeParse(asReference(empty)).success).toBe(false)
	})

	it('refuses a Quote carrying no text at both ends', () => {
		const untexted = { type: 'quote', source: { title: 'Permit throughput' } }

		expect(offerMaterialSchema.safeParse(untexted).success).toBe(false)
		expect(referenceSchema.safeParse(asReference(untexted)).success).toBe(false)
	})

	// Each states its own noun, so a refusal reads as being about the thing the
	// writer was looking at.
	it('names itself in its own refusal', () => {
		const empty = { type: 'reference' }

		expect(offerMaterialSchema.safeParse(empty).error?.issues[0].message).toContain(
			'An Offer carries',
		)
		expect(
			referenceSchema.safeParse(asReference(empty)).error?.issues[0].message,
		).toContain('A Reference carries')
	})
})

describe('copying an Accepted Offer into the Plan', () => {
	it('carries the material and the Provenance, unplaced', () => {
		const offer = makeOffer({
			id: 'o1',
			type: 'quote',
			text: 'We did not decide to stop building.',
			source: { title: 'Permit throughput', year: 2023 },
			note: 'Opens §2 well.',
			disposition: 'accepted',
		})

		const { plan: next, reference, alreadyThere } = acceptIntoPlan(plan, offer, 'r1')

		expect(alreadyThere).toBe(false)
		expect(reference).toEqual({
			id: 'r1',
			type: 'quote',
			provenance: { type: 'offer', offerId: 'o1' },
			nodeId: null,
			text: 'We did not decide to stop building.',
			source: { title: 'Permit throughput', year: 2023 },
			note: 'Opens §2 well.',
		})
		expect(next.references).toEqual([reference])
	})

	it('says "nothing here" by leaving the key out', () => {
		const offer = makeOffer({ id: 'o1', source: { title: 'Housing starts' } })

		const { reference } = acceptIntoPlan(plan, offer, 'r1')

		expect(Object.keys(reference).sort()).toEqual([
			'id',
			'nodeId',
			'provenance',
			'source',
			'type',
		])
	})

	it('leaves the Plan it was given untouched', () => {
		const offer = makeOffer({ id: 'o1', disposition: 'accepted' })

		acceptIntoPlan(plan, offer, 'r1')

		expect(plan.references).toEqual([])
	})

	// The two writes Accepting makes are not atomic, so the second one can be
	// asked for twice — by a double click, or by the re-add of an Offer whose
	// Plan write turns out to have landed after all.
	it('recognises an Offer the Plan already holds, and copies it once', () => {
		const offer = makeOffer({ id: 'o1', disposition: 'accepted' })
		const first = acceptIntoPlan(plan, offer, 'r1')

		const second = acceptIntoPlan(first.plan, offer, 'r2')

		expect(second.alreadyThere).toBe(true)
		expect(second.reference.id).toBe('r1')
		expect(second.plan.references).toHaveLength(1)
	})

	// The whole reason Provenance is the pointer: the writer owns the copy.
	it('recognises it after the writer has edited the copy past recognition', () => {
		const offer = makeOffer({
			id: 'o1',
			source: { title: 'Permit throughput in six mid-sized cities' },
			disposition: 'accepted',
		})
		const { plan: accepted } = acceptIntoPlan(plan, offer, 'r1')

		const edited = {
			...accepted,
			references: accepted.references.map((reference) => ({
				...reference,
				source: { title: 'Okonkwo on permit queues' },
				nodeId: 'n1',
			})),
		}

		expect(referenceForOffer(edited, 'o1')?.id).toBe('r1')
		expect(acceptIntoPlan(edited, offer, 'r2').alreadyThere).toBe(true)
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
				nodeId: 'n2',
				provenance: { type: 'offer', offerId: 'o2' },
			}),
			makeReference({ id: 'r3', source: { title: 'The writer typed this one' } }),
		],
	})

	it('counts each disposition, and the whole list', () => {
		const ledger = offerLedger(held, offers)

		expect(ledger.counts).toEqual({ all: 5, undecided: 1, accepted: 2, declined: 2 })
		expect(ledger.byDisposition.declined.map((offer) => offer.id)).toEqual(['o4', 'o5'])
	})

	it('groups the Plan half by Section, in Outline order, empty ones included', () => {
		const ledger = offerLedger(held, offers)

		expect(
			ledger.sections.map((section) => [
				section.label,
				section.references.map((reference) => reference.id),
			]),
		).toEqual([
			['§1', []],
			['§2', ['r1', 'r2']],
			['§2.1', []],
		])
		expect(ledger.unplaced.map((reference) => reference.id)).toEqual(['r3'])
	})

	// The writer's own Reference is in the Plan half like any other, and it is
	// in no Offer's group: it was never offered.
	it('leaves a Reference the writer wrote out of the Offer counts', () => {
		const ledger = offerLedger(held, offers)

		expect(ledger.counts.all).toBe(5)
		expect(ledger.unplaced[0].provenance).toEqual({ type: 'writer' })
	})

	it('strands an Accepted Offer that no Reference points back at', () => {
		const ledger = offerLedger(held, [
			...offers,
			makeOffer({ id: 'o6', disposition: 'accepted' }),
		])

		expect(ledger.stranded.map((offer) => offer.id)).toEqual(['o6'])
	})

	// An unplaced Reference is Accepted and waiting for a Section. A stranded
	// Offer is Accepted and in the Plan nowhere at all. Telling the writer the
	// second is the first would send them looking for something that is not there.
	it('does not strand an Accepted Offer whose Reference carries no Section', () => {
		const offer = makeOffer({ id: 'o7', disposition: 'accepted' })
		const { plan: next } = acceptIntoPlan(held, offer, 'r4')

		const ledger = offerLedger(next, [...offers, offer])

		expect(ledger.stranded).toEqual([])
		expect(ledger.unplaced.map((reference) => reference.id)).toEqual(['r3', 'r4'])
	})

	it('reads an empty Article as an empty Ledger', () => {
		const ledger = offerLedger(makePlan(), [])

		expect(ledger.counts).toEqual({ all: 0, undecided: 0, accepted: 0, declined: 0 })
		expect(ledger.sections).toEqual([])
		expect(ledger.stranded).toEqual([])
	})
})

describe('the fingerprint a re-offer is recognised by', () => {
	const material: OfferMaterial = {
		type: 'reference',
		source: {
			title: 'Permit throughput in six mid-sized cities',
			author: 'R. Okonkwo',
			year: 2023,
			url: 'https://quarterly.example/permit-throughput',
		},
	}

	it('matches the same source turned up again, whitespace and case aside', () => {
		const again: OfferMaterial = {
			...material,
			source: {
				...material.source,
				title: '  Permit Throughput in Six Mid-Sized Cities ',
			},
		}

		expect(offerFingerprint(again)).toBe(offerFingerprint(material))
	})

	// The Guide writes the note fresh each session, and it says nothing about
	// which source this is.
	it('ignores the note', () => {
		expect(offerFingerprint({ ...material, note: 'Primary data.' })).toBe(
			offerFingerprint(material),
		)
	})

	// Offers are flat: two Quotes from one publication are two Offers, so a url
	// on its own would fold them into one.
	it('separates two Quotes pulled from one source', () => {
		const first: OfferMaterial = {
			...material,
			type: 'quote',
			text: 'Forty separate times.',
		}
		const second: OfferMaterial = { ...first, text: 'The meter runs on an empty lot.' }

		expect(offerFingerprint(second)).not.toBe(offerFingerprint(first))
	})

	it('separates a Quote from the Reference carrying the same text', () => {
		const quote: OfferMaterial = {
			...material,
			type: 'quote',
			text: 'Forty separate times.',
		}

		expect(offerFingerprint({ ...quote, type: 'reference' })).not.toBe(
			offerFingerprint(quote),
		)
	})
})
