import { MockLanguageModelV3 } from 'ai/test'
import { env, SELF } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'

import { distilRules } from '../../src/server/learning/distil'
import { acceptedRules, declinedRules } from '../../src/server/learning/rules'
import { chatSystemPrompt } from '../../src/server/llm/prompt'
import { distillationFloor, type LearnedRule } from '../../src/shared/learning'

/**
 * Learned rules and the distillation pass — `docs/architecture.md` §12.
 *
 * No test calls a model, for the reason `chat-turn.test.ts` gives: Workers AI is
 * remote-only and `pnpm test` runs without an API token. The pass is handed a
 * scripted one instead, which is the boundary that matters — what it does with
 * an answer, and what it refuses to ask for in the first place.
 */

const base = 'https://harness.test/api/learning'

beforeEach(async () => {
	await env.DB.prepare('DELETE FROM appearance').run()
	await env.DB.prepare('DELETE FROM learned_rule').run()
})

/** Ruled Offers straight into the copy, which is what the pass reads. Writing
 * them here rather than through an Article Agent keeps the pass's own boundary
 * in view: it reads D1 and never wakes an Agent. */
async function seedRulings(count: number, accepted: number): Promise<void> {
	const insert = env.DB.prepare(
		`INSERT INTO appearance
		 (id, article_id, batch_id, policy, position, duplicate, offer_id, type, text,
		  source, note, disposition, offered_at, decided_at)
		 VALUES (?, 'a1', 'b1', 'primary-sources', ?, 0, ?, 'link', NULL, ?, NULL, ?, 1, ?)`,
	)

	await env.DB.batch(
		Array.from({ length: count }, (_unused, index) =>
			insert.bind(
				`a1:b1:${index}`,
				index,
				`offer-${index}`,
				JSON.stringify({
					title: `Source ${index}`,
					year: index < accepted ? 2023 : undefined,
				}),
				index < accepted ? 'accepted' : 'declined',
				1000 + index,
			),
		),
	)
}

/** A model that answers one distillation with the rules given. */
function scriptedModel(rules: { text: string; basis: string }[]): MockLanguageModelV3 {
	return new MockLanguageModelV3({
		doGenerate: async () => ({
			content: [{ type: 'text', text: JSON.stringify({ rules }) }],
			finishReason: { unified: 'stop', raw: undefined },
			usage: {
				inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
				outputTokens: { total: 0, text: 0, reasoning: 0 },
			},
			warnings: [],
		}),
	})
}

const oneRule = [
	{
		text: 'Leave out a source with no publication year.',
		basis: 'Eleven of the fourteen declined sources carried no year.',
	},
]

describe('the distillation pass', () => {
	// The guard that matters most. A model given four decisions will find a
	// pattern in them, the writer cannot tell that pattern from a real one, and
	// an Accepted rule then steers every turn.
	it('refuses below the floor, and says how far off it is', async () => {
		await seedRulings(distillationFloor - 1, 2)

		const result = await distilRules(env.DB, scriptedModel(oneRule))

		expect(result).toEqual({
			type: 'too_little',
			ruled: distillationFloor - 1,
			needed: distillationFloor,
		})
		await expect(
			env.DB.prepare('SELECT COUNT(*) AS held FROM learned_rule').first<{
				held: number
			}>(),
		).resolves.toMatchObject({ held: 0 })
	})

	it('records what it read, as Undecided rules carrying what they were read off', async () => {
		await seedRulings(distillationFloor, 6)

		const result = await distilRules(env.DB, scriptedModel(oneRule))

		expect(result.type).toBe('distilled')
		if (result.type !== 'distilled') return

		expect(result.observed).toBe(distillationFloor)
		expect(result.rules).toMatchObject([
			{
				text: oneRule[0].text,
				basis: oneRule[0].basis,
				observed: distillationFloor,
				disposition: 'undecided',
				decidedAt: null,
			},
		])
	})

	// Undecided is not a Decline. A writer who ruled on six of seventeen left
	// eleven unread, and handing those over as negatives would teach the pass
	// that everything below the fold is bad.
	it('counts only ruled Offers towards the floor', async () => {
		await seedRulings(distillationFloor, 4)
		await env.DB.prepare(
			`UPDATE appearance SET disposition = 'undecided', decided_at = NULL
			 WHERE position >= 5`,
		).run()

		const result = await distilRules(env.DB, scriptedModel(oneRule))

		expect(result).toMatchObject({ type: 'too_little', ruled: 5 })
	})

	it('shows the pass what the writer already turned down', async () => {
		await seedRulings(distillationFloor, 6)
		const [rule] = await recordThrough(scriptedModel(oneRule))
		await rulePatch(rule.id, { ruling: 'declined' })

		let shown = ''
		const watching = new MockLanguageModelV3({
			doGenerate: async ({ prompt }) => {
				shown = JSON.stringify(prompt)

				return {
					content: [{ type: 'text', text: JSON.stringify({ rules: [] }) }],
					finishReason: { unified: 'stop' as const, raw: undefined },
					usage: {
						inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
						outputTokens: { total: 0, text: 0, reasoning: 0 },
					},
					warnings: [],
				}
			},
		})

		await distilRules(env.DB, watching)

		expect(shown).toContain('already read and rejected')
		expect(shown).toContain(oneRule[0].text)
	})
})

/** Run a pass and hand back what it recorded, for the tests that need a rule
 * on the table before they start. */
async function recordThrough(model: MockLanguageModelV3): Promise<LearnedRule[]> {
	const result = await distilRules(env.DB, model)

	return result.type === 'distilled' ? result.rules : []
}

async function rulePatch(id: string, body: unknown): Promise<Response> {
	return SELF.fetch(`${base}/rules/${id}`, {
		method: 'PATCH',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	})
}

describe('ruling on a Learned rule', () => {
	it('Accepts one, and only then does it reach a turn', async () => {
		await seedRulings(distillationFloor, 6)
		const [rule] = await recordThrough(scriptedModel(oneRule))

		await expect(acceptedRules(env.DB)).resolves.toEqual([])

		const response = await rulePatch(rule.id, { ruling: 'accepted' })

		expect(response.status).toBe(200)
		await expect(acceptedRules(env.DB)).resolves.toMatchObject([{ id: rule.id }])
	})

	it('Declines one, keeps it, and restores it', async () => {
		await seedRulings(distillationFloor, 6)
		const [rule] = await recordThrough(scriptedModel(oneRule))

		await rulePatch(rule.id, { ruling: 'declined' })
		await expect(declinedRules(env.DB)).resolves.toHaveLength(1)

		const restored = await rulePatch(rule.id, { restore: true })

		expect(restored.status).toBe(200)
		await expect(declinedRules(env.DB)).resolves.toEqual([])
	})

	// The same rule an Offer has: restoring undoes a Decline, and nothing else.
	it('restores only a Declined rule', async () => {
		await seedRulings(distillationFloor, 6)
		const [rule] = await recordThrough(scriptedModel(oneRule))
		await rulePatch(rule.id, { ruling: 'accepted' })

		const response = await rulePatch(rule.id, { restore: true })

		expect(response.status).toBe(404)
		await expect(response.json()).resolves.toMatchObject({
			error: expect.stringContaining('Restoring undoes a Decline'),
		})
	})

	it('refuses a body that says nothing, rather than answering 200', async () => {
		const response = await rulePatch('whatever', {})

		expect(response.status).toBe(400)
	})

	it('answers 404 for a rule that does not exist', async () => {
		const response = await rulePatch('nope', { ruling: 'accepted' })

		expect(response.status).toBe(404)
	})
})

describe('the learning routes', () => {
	it('lists every rule whatever the writer decided', async () => {
		await seedRulings(distillationFloor, 6)
		const [rule] = await recordThrough(scriptedModel(oneRule))
		await rulePatch(rule.id, { ruling: 'declined' })

		const response = await SELF.fetch(`${base}/rules`)

		expect(response.status).toBe(200)
		await expect(response.json()).resolves.toMatchObject({
			rules: [{ id: rule.id, disposition: 'declined' }],
		})
	})

	it('reports each policy and what became of what it turned up', async () => {
		await seedRulings(distillationFloor, 6)

		const response = await SELF.fetch(`${base}/policies`)

		await expect(response.json()).resolves.toMatchObject({
			policies: [
				{
					policy: 'primary-sources',
					offered: distillationFloor,
					accepted: 6,
					declined: distillationFloor - 6,
				},
			],
		})
	})

	it('answers 409 with the count when the pass has too little to read', async () => {
		await seedRulings(3, 1)

		const response = await SELF.fetch(`${base}/rules/distil`, { method: 'POST' })

		expect(response.status).toBe(409)
		await expect(response.json()).resolves.toMatchObject({
			ruled: 3,
			needed: distillationFloor,
		})
	})
})

describe('a Learned rule in the turn prompt', () => {
	it('is absent when the writer has Accepted none', () => {
		expect(chatSystemPrompt()).toBe(chatSystemPrompt([]))
		expect(chatSystemPrompt([])).not.toContain('past decisions')
	})

	// Marked as read off past decisions rather than stated as fact, and the
	// writer's own words on this Article win — a distilled pattern is not a rule
	// the writer wrote.
	it('is carried as a reading the Article may overrule', () => {
		const prompt = chatSystemPrompt([oneRule[0].text])

		expect(prompt).toContain(oneRule[0].text)
		expect(prompt).toContain('past decisions')
		expect(prompt).toContain('unless this Article says otherwise')
	})

	it('leaves the guide rules in front of it, where the cache wants them', () => {
		const prompt = chatSystemPrompt([oneRule[0].text])

		expect(prompt.indexOf('You are the guide in a writing harness')).toBe(0)
		expect(prompt.indexOf(oneRule[0].text)).toBeGreaterThan(
			prompt.indexOf('You do not use marketing-speak'),
		)
	})
})
