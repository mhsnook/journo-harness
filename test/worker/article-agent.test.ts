import { env, evictDurableObject, runInDurableObject } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

import type { Offer } from '../../src/shared/offer'
import { emptyPlan, isPlanRefused } from '../../src/shared/plan'
import { makeNode, makePlan, makeReference } from '../shared/plan-fixtures'
import { openAgentSocket } from './agent-socket'

/** A Plan that parses: one Outline node, and one Reference placed at it. */
const plan = makePlan({
	title: 'The permit queue',
	totalTarget: 1200,
	outline: [makeNode({ id: 'n1', title: 'The opening' })],
	references: [makeReference({ id: 'r1', text: 'Forty separate times.', nodeId: 'n1' })],
})

/** The same Plan with its Reference placed at a node no Outline carries. The
 * object shape is valid, so only `planSchema`'s referential check refuses it. */
const orphaned = {
	...plan,
	references: [
		makeReference({ id: 'r1', text: 'Forty separate times.', nodeId: 'gone' }),
	],
}

const quote = {
	kind: 'quote' as const,
	text: 'We did not decide to stop building.',
	source: { title: 'Permit throughput in six mid-sized cities', year: 2023 },
}

const reference = {
	kind: 'reference' as const,
	source: { title: 'Zoning and the missing middle', author: 'A. Weill' },
	note: 'Primary data for the opening figure.',
}

describe('the Plan in Article Agent state', () => {
	it('opens a new Article on the empty Plan', async () => {
		const writer = await openAgentSocket('opens-empty')

		await expect(writer.next('cf_agent_state')).resolves.toMatchObject({
			state: emptyPlan(),
		})
	})

	it('persists a Plan that parses, and broadcasts it to the other connection', async () => {
		const writer = await openAgentSocket('valid-write')
		const reader = await openAgentSocket('valid-write')
		await writer.next('cf_agent_state')
		await reader.next('cf_agent_state')

		writer.setState(plan)

		await expect(reader.next('cf_agent_state')).resolves.toMatchObject({ state: plan })

		const returning = await openAgentSocket('valid-write')
		await expect(returning.next('cf_agent_state')).resolves.toMatchObject({ state: plan })
	})

	it('refuses a Plan that does not parse, and keeps the one it had', async () => {
		const writer = await openAgentSocket('invalid-write')
		const reader = await openAgentSocket('invalid-write')
		await writer.next('cf_agent_state')
		await reader.next('cf_agent_state')
		writer.setState(plan)
		await reader.next('cf_agent_state')

		writer.setState(orphaned)

		await expect(writer.next('cf_agent_state_error')).resolves.toMatchObject({
			type: 'cf_agent_state_error',
		})
		await expect(reader.quiet('cf_agent_state')).resolves.toEqual([])

		const returning = await openAgentSocket('invalid-write')
		await expect(returning.next('cf_agent_state')).resolves.toMatchObject({ state: plan })
	})

	it('tells the writer which rule the refused Plan broke', async () => {
		const writer = await openAgentSocket('refusal-reason')
		await writer.next('cf_agent_state')

		writer.setState(orphaned)

		const frame = await writer.next('plan_refused')

		expect(isPlanRefused(frame)).toBe(true)
		expect(frame.error).toContain('which no Outline node carries')
	})
})

describe('Offers in the Article Agent', () => {
	// `@callable` is the whole allowlist of what a browser may invoke on this
	// Durable Object, so the set is worth naming. It also proves the decorator
	// survived the build: oxc does not lower one, and the Babel transform in
	// `agents/vite` is what does.
	it('marks every Offer method callable', async () => {
		const stub = env.ArticleAgent.get(env.ArticleAgent.idFromName('callable-set'))

		const methods = await runInDurableObject(stub, (agent) => [
			...agent.getCallableMethods().keys(),
		])

		expect(methods.sort()).toEqual([
			'createOffer',
			'listOffers',
			'restoreOffer',
			'setOfferDisposition',
		])
	})

	it('records an Offer as Undecided and lists it', async () => {
		const writer = await openAgentSocket('offer-create')

		const offer = await writer.call<Offer>('createOffer', quote)

		expect(offer).toMatchObject({
			kind: 'quote',
			disposition: 'undecided',
			decidedAt: null,
		})
		await expect(writer.call<Offer[]>('listOffers')).resolves.toEqual([offer])
	})

	it('refuses an Offer carrying neither a text nor a source', async () => {
		const writer = await openAgentSocket('offer-empty')

		await expect(writer.call('createOffer', { kind: 'reference' })).rejects.toThrow(
			/text, a source, or both/,
		)
	})

	it('rules on an Offer, and restores a Declined one', async () => {
		const writer = await openAgentSocket('offer-rulings')
		const offer = await writer.call<Offer>('createOffer', reference)

		const declined = await writer.call<Offer>('setOfferDisposition', offer.id, 'declined')
		expect(declined.disposition).toBe('declined')
		expect(declined.decidedAt).not.toBeNull()

		const restored = await writer.call<Offer>('restoreOffer', offer.id)
		expect(restored).toEqual({ ...offer, disposition: 'undecided', decidedAt: null })
	})

	it('restores only a Declined Offer', async () => {
		const writer = await openAgentSocket('offer-restore-guard')
		const offer = await writer.call<Offer>('createOffer', reference)
		await writer.call('setOfferDisposition', offer.id, 'accepted')

		await expect(writer.call('restoreOffer', offer.id)).rejects.toThrow(
			/is accepted, and restoring undoes a Decline/,
		)
	})

	it('keeps its Offers through a hibernation cycle', async () => {
		const writer = await openAgentSocket('offer-hibernation')
		const kept = await writer.call<Offer>('createOffer', quote)
		const declined = await writer.call<Offer>('createOffer', reference)
		await writer.call('setOfferDisposition', declined.id, 'declined')

		// The socket hibernates rather than closing, so the next call wakes the
		// Article Agent with its in-memory state gone and onStart run again.
		await evictDurableObject(
			env.ArticleAgent.get(env.ArticleAgent.idFromName('offer-hibernation')),
		)

		const offers = await writer.call<Offer[]>('listOffers')

		expect(offers.map((offer) => [offer.id, offer.disposition])).toEqual([
			[kept.id, 'undecided'],
			[declined.id, 'declined'],
		])
	})

	it('leaves the Plan alone when a disposition changes', async () => {
		const writer = await openAgentSocket('offer-and-plan')
		await writer.next('cf_agent_state')
		writer.setState(plan)
		const offer = await writer.call<Offer>('createOffer', quote)

		await writer.call('setOfferDisposition', offer.id, 'accepted')

		await expect(writer.quiet('cf_agent_state')).resolves.toEqual([])

		const returning = await openAgentSocket('offer-and-plan')
		await expect(returning.next('cf_agent_state')).resolves.toMatchObject({ state: plan })
	})
})
