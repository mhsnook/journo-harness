import { env, runInDurableObject } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'

import type { RecordedBatch } from '../../src/server/article-agent'
import { policyTallies, ruledCount } from '../../src/server/learning/appearances'
import type { Offer } from '../../src/shared/offer'
import { defaultResearchPolicy, type OfferBatch } from '../../src/shared/research'
import { openAgentSocket } from './agent-socket'

/**
 * Research batches, appearances, and the copy of them in D1 —
 * `docs/architecture.md` §12.
 *
 * What is being tested is the evidence a policy comparison rests on: which turn
 * surfaced what, in what order, and what the writer did about it. The Offer's
 * own behaviour is `article-agent.test.ts`.
 */

const quote = {
	type: 'quote' as const,
	text: 'We did not decide to stop building.',
	source: { title: 'Permit throughput in six mid-sized cities', year: 2023 },
}

const reference = {
	type: 'link' as const,
	source: { title: 'Zoning and the missing middle', author: 'A. Weill' },
	note: 'Primary data for the opening figure.',
}

const third = {
	type: 'link' as const,
	source: { title: 'What the hearings actually said', publication: 'City Desk' },
}

// Isolated storage does not roll a D1 write back between tests.
beforeEach(async () => {
	await env.DB.prepare('DELETE FROM appearance').run()
})

function recordOffers(
	name: string,
	batch: unknown,
	policy?: string,
): Promise<RecordedBatch> {
	const stub = env.ArticleAgent.get(env.ArticleAgent.idFromName(name))

	return runInDurableObject(stub, (agent) => agent.recordOffers(batch, policy))
}

function listBatches(name: string): Promise<OfferBatch[]> {
	const stub = env.ArticleAgent.get(env.ArticleAgent.idFromName(name))

	return runInDurableObject(stub, (agent) => agent.listOfferBatches())
}

/** The appearances D1 holds for one Article, in the order they were surfaced. */
async function appearancesFor(articleId: string) {
	const rows = await env.DB.prepare(
		`SELECT batch_id, policy, position, duplicate, offer_id, type, disposition, decided_at
		 FROM appearance WHERE article_id = ? ORDER BY offered_at, position`,
	)
		.bind(articleId)
		.all<{
			batch_id: string
			policy: string
			position: number
			duplicate: number
			offer_id: string
			type: string
			disposition: string
			decided_at: number | null
		}>()

	return rows.results
}

describe('a research turn as a batch', () => {
	it('records the turn, its policy, and what it surfaced in order', async () => {
		await openAgentSocket('batch-shape')

		const { batch, recorded } = await recordOffers('batch-shape', [quote, reference])

		expect(batch).toMatchObject({ policy: defaultResearchPolicy, offered: 2 })
		await expect(listBatches('batch-shape')).resolves.toEqual([batch])

		const appearances = await appearancesFor('batch-shape')
		expect(appearances.map((row) => [row.position, row.offer_id])).toEqual([
			[0, recorded[0].offer.id],
			[1, recorded[1].offer.id],
		])
		expect(appearances.every((row) => row.batch_id === batch.id)).toBe(true)
	})

	it('carries the policy it was given, so two routines are told apart', async () => {
		await openAgentSocket('batch-policy')

		await recordOffers('batch-policy', [quote], 'primary-sources')
		await recordOffers('batch-policy', [reference], 'contrarian-takes')

		await expect(listBatches('batch-policy')).resolves.toMatchObject([
			{ policy: 'primary-sources' },
			{ policy: 'contrarian-takes' },
		])
	})

	// Two turns in one invocation, where the Worker's clock barely advances — so
	// `created_at` cannot order them and `seq` does. The same argument the offer
	// table's own `seq` carries.
	it('lists two turns recorded in one invocation in the order they ran', async () => {
		await openAgentSocket('batch-order')
		const stub = env.ArticleAgent.get(env.ArticleAgent.idFromName('batch-order'))

		const policies = await runInDurableObject(stub, async (agent) => {
			await agent.recordOffers([quote], 'first-policy')
			await agent.recordOffers([reference], 'second-policy')
			await agent.recordOffers([third], 'third-policy')

			return agent.listOfferBatches().map((batch) => batch.policy)
		})

		expect(policies).toEqual(['first-policy', 'second-policy', 'third-policy'])
	})

	it('refuses a turn carrying no policy, before it writes a batch', async () => {
		await openAgentSocket('batch-no-policy')

		await expect(recordOffers('batch-no-policy', [quote], '  ')).rejects.toThrow(
			/expected string to have >=1 characters/,
		)

		await expect(listBatches('batch-no-policy')).resolves.toEqual([])
		await expect(appearancesFor('batch-no-policy')).resolves.toEqual([])
	})

	// The reason appearances are a table of their own. A re-offer writes no
	// second Offer row, so without this the second turn leaves no trace — and
	// "which policy turned this up" is exactly what a comparison needs.
	it('gives a re-offered source an appearance in the turn that turned it up again', async () => {
		await openAgentSocket('batch-reoffer')
		const first = await recordOffers('batch-reoffer', [reference], 'primary-sources')

		const second = await recordOffers('batch-reoffer', [reference], 'contrarian-takes')

		expect(second.recorded[0].duplicate).toBe(true)
		expect(second.recorded[0].offer.id).toBe(first.recorded[0].offer.id)

		const appearances = await appearancesFor('batch-reoffer')
		expect(appearances.map((row) => [row.policy, row.duplicate])).toEqual([
			['primary-sources', 0],
			['contrarian-takes', 1],
		])
	})

	it('gives one turn that repeats itself two appearances at two positions', async () => {
		await openAgentSocket('batch-repeat')

		const { batch } = await recordOffers('batch-repeat', [reference, reference])

		expect(batch.offered).toBe(2)
		await expect(appearancesFor('batch-repeat')).resolves.toMatchObject([
			{ position: 0, duplicate: 0 },
			{ position: 1, duplicate: 1 },
		])
	})
})

describe('a ruling reaching the copy in D1', () => {
	it('marks every appearance of the Offer, in whichever turn surfaced it', async () => {
		const writer = await openAgentSocket('ruling-mirror')
		const first = await recordOffers('ruling-mirror', [reference], 'primary-sources')
		await recordOffers('ruling-mirror', [reference], 'contrarian-takes')

		await writer.call<Offer>(
			'setOfferDisposition',
			first.recorded[0].offer.id,
			'accepted',
		)

		const appearances = await appearancesFor('ruling-mirror')
		expect(appearances.map((row) => row.disposition)).toEqual(['accepted', 'accepted'])
		expect(appearances.every((row) => row.decided_at !== null)).toBe(true)
	})

	it('follows a restore back to Undecided', async () => {
		const writer = await openAgentSocket('ruling-restore-mirror')
		const { recorded } = await recordOffers('ruling-restore-mirror', [quote])
		await writer.call('setOfferDisposition', recorded[0].offer.id, 'declined')

		await writer.call<Offer>('restoreOffer', recorded[0].offer.id)

		await expect(appearancesFor('ruling-restore-mirror')).resolves.toMatchObject([
			{ disposition: 'undecided', decided_at: null },
		])
	})

	// The repair path for a mirror write that was lost. The ids are built from
	// the Article, the batch, and the position, so a second run has to replace
	// rather than double.
	it('re-mirrors an Article without writing a row twice', async () => {
		const writer = await openAgentSocket('ruling-resync')
		const { recorded } = await recordOffers('ruling-resync', [quote, reference, third])
		await writer.call('setOfferDisposition', recorded[1].offer.id, 'accepted')

		// D1 loses the lot.
		await env.DB.prepare('DELETE FROM appearance').run()
		await expect(appearancesFor('ruling-resync')).resolves.toEqual([])

		await expect(writer.call<number>('syncAppearances')).resolves.toBe(3)
		await expect(writer.call<number>('syncAppearances')).resolves.toBe(3)

		const appearances = await appearancesFor('ruling-resync')
		expect(appearances).toHaveLength(3)
		expect(appearances.map((row) => row.disposition)).toEqual([
			'undecided',
			'accepted',
			'undecided',
		])
	})
})

describe('the policy tally', () => {
	it('counts appearances offered and distinct Offers ruled on', async () => {
		const writer = await openAgentSocket('tally-basic')
		const { recorded } = await recordOffers(
			'tally-basic',
			[quote, reference, third],
			'primary-sources',
		)
		await writer.call('setOfferDisposition', recorded[0].offer.id, 'accepted')
		await writer.call('setOfferDisposition', recorded[1].offer.id, 'declined')

		const [tally] = await policyTallies(env.DB)

		expect(tally).toEqual({
			policy: 'primary-sources',
			batches: 1,
			offered: 3,
			distinct: 3,
			duplicates: 0,
			accepted: 1,
			declined: 1,
			undecided: 1,
			acceptRate: 0.5,
		})
	})

	// An Undecided Offer is not a Decline, so it stays out of the rate and is
	// reported beside it. A policy nobody finished reading should look unread
	// rather than good.
	it('reports no accept rate for a policy nothing has been ruled on', async () => {
		await openAgentSocket('tally-unread')
		await recordOffers('tally-unread', [quote, reference], 'contrarian-takes')

		const [tally] = await policyTallies(env.DB)

		expect(tally).toMatchObject({ undecided: 2, acceptRate: null })
	})

	it('keeps two policies apart, and counts a repeat once against the ruling', async () => {
		const writer = await openAgentSocket('tally-two')
		const first = await recordOffers('tally-two', [reference], 'primary-sources')
		await recordOffers('tally-two', [reference, quote], 'contrarian-takes')
		await writer.call('setOfferDisposition', first.recorded[0].offer.id, 'accepted')

		const tallies = await policyTallies(env.DB)

		expect(tallies.map((tally) => tally.policy)).toEqual([
			'contrarian-takes',
			'primary-sources',
		])
		expect(tallies).toMatchObject([
			{ policy: 'contrarian-takes', offered: 2, distinct: 2, duplicates: 1, accepted: 1 },
			{ policy: 'primary-sources', offered: 1, distinct: 1, duplicates: 0, accepted: 1 },
		])
	})

	it('counts one ruled Offer once, however many turns surfaced it', async () => {
		const writer = await openAgentSocket('ruled-count')
		const { recorded } = await recordOffers('ruled-count', [quote, reference])
		await recordOffers('ruled-count', [quote], 'contrarian-takes')
		await writer.call('setOfferDisposition', recorded[0].offer.id, 'accepted')

		await expect(ruledCount(env.DB)).resolves.toBe(1)
	})
})
