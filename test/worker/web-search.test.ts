import { afterEach, describe, expect, it, vi } from 'vitest'

import { readResults, searchRequest, webSearch } from '../../src/server/llm/search'

/**
 * The search boundary — `docs/architecture.md` §7. No test reaches the
 * provider: `fetch` is stubbed, and what is under test is the request built,
 * the response read, and the rule that a failure answers rather than throws.
 */

/** An `Env` carrying only what `webSearch` reads. */
const withKey = { EXA_API_KEY: 'test-key' } as Env
const withoutKey = {} as Env

/** One provider response, as the OpenAPI spec shapes it. */
function providerBody(results: unknown[]) {
	return JSON.stringify({ requestId: 'r1', results, costDollars: { total: 0.005 } })
}

/** Stated rather than inferred, so `mock.calls` types as a request rather
 * than an empty tuple. */
type Fetched = (url: string, sent: RequestInit) => Promise<Response>

/** A stubbed `fetch` answering every call the same way. */
function answers(body: string, init: ResponseInit = {}) {
	return vi.fn<Fetched>(async () => new Response(body, init))
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('the search boundary', () => {
	it('offers no search where no key is set', () => {
		expect(webSearch(withoutKey)).toBeUndefined()
		expect(webSearch(withKey)).toBeTypeOf('function')
	})

	it('sends the query, the key, and a capped result count', async () => {
		const fetched = answers(providerBody([]))
		vi.stubGlobal('fetch', fetched)

		await webSearch(withKey)?.({ query: 'permit backlog', count: 3 })

		const [url, init] = fetched.mock.calls[0]
		expect(url).toBe('https://api.exa.ai/search')
		expect(init.method).toBe('POST')
		expect(new Headers(init.headers).get('x-api-key')).toBe('test-key')

		const sent = JSON.parse(String(init.body))
		expect(sent).toMatchObject({ query: 'permit backlog', numResults: 3 })
	})

	it('passes a since date through as the published-date floor', () => {
		expect(searchRequest({ query: 'permit backlog', since: '2026-01-01' })).toMatchObject(
			{
				startPublishedDate: '2026-01-01',
			},
		)
		expect(searchRequest({ query: 'permit backlog' })).not.toHaveProperty(
			'startPublishedDate',
		)
	})

	it('asks for highlights against the same query, and not for page text', () => {
		const sent = searchRequest({ query: 'permit backlog' })

		expect(sent.contents).toMatchObject({ highlights: { query: 'permit backlog' } })
		expect(sent.contents).not.toHaveProperty('text')
	})
})

describe('a provider result', () => {
	it('carries the fields an Offer is written from', () => {
		const [result] = readResults({
			results: [
				{
					url: 'https://example.test/permits',
					title: 'The permit queue',
					author: 'A Reporter',
					publishedDate: '2026-03-04T09:12:00.000Z',
					highlights: ['The backlog stood at 4,100 in March.'],
				},
			],
		})

		expect(result).toEqual({
			url: 'https://example.test/permits',
			title: 'The permit queue',
			author: 'A Reporter',
			published: '2026-03-04',
			excerpt: 'The backlog stood at 4,100 in March.',
		})
	})

	// Every field but the url is optional at the source.
	it('drops the fields the page did not carry, and keeps the url', () => {
		const [result] = readResults({
			results: [{ url: 'https://example.test/permits', author: null, highlights: [] }],
		})

		expect(result).toEqual({ url: 'https://example.test/permits' })
	})

	it('joins several highlights into one excerpt', () => {
		const [result] = readResults({
			results: [
				{
					url: 'https://example.test/permits',
					highlights: [
						'  The backlog stood at 4,100.  ',
						'',
						'It had doubled in a year.',
					],
				},
			],
		})

		expect(result.excerpt).toBe('The backlog stood at 4,100. … It had doubled in a year.')
	})

	it('drops a result with no url and keeps the rest', () => {
		const results = readResults({
			results: [
				{ title: 'No url here' },
				{ url: 'not-a-url' },
				{ url: 'https://example.test/permits' },
			],
		})

		expect(results.map((result) => result.url)).toEqual(['https://example.test/permits'])
	})

	it('ignores fields the provider added', () => {
		const [result] = readResults({
			results: [{ url: 'https://example.test/permits', score: 0.46, favicon: 'x.ico' }],
		})

		expect(result).toEqual({ url: 'https://example.test/permits' })
	})

	it('makes nothing of a body that is not a search response', () => {
		expect(readResults({ error: 'nope' })).toEqual([])
		expect(readResults(null)).toEqual([])
	})
})

/** A rejected `execute` would end the turn, so every failure comes back as an
 * answer the model can relay. */
describe('a search that fails', () => {
	it('answers with the provider status rather than throwing', async () => {
		vi.stubGlobal('fetch', answers('rate limit exceeded', { status: 429 }))

		const outcome = await webSearch(withKey)?.({ query: 'permit backlog' })

		expect(outcome?.status).toBe('unavailable')
		expect(outcome).toMatchObject({ reason: expect.stringContaining('429') })
		expect(outcome).toMatchObject({ reason: expect.stringContaining('rate limit') })
	})

	it('answers when the request never lands', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn<Fetched>(async () => {
				throw new Error('Network connection lost.')
			}),
		)

		const outcome = await webSearch(withKey)?.({ query: 'permit backlog' })

		expect(outcome).toEqual({
			status: 'unavailable',
			reason: 'Network connection lost.',
		})
	})

	it('answers when the body is not JSON', async () => {
		vi.stubGlobal('fetch', answers('<html>gateway timeout</html>'))

		const outcome = await webSearch(withKey)?.({ query: 'permit backlog' })

		expect(outcome?.status).toBe('unavailable')
	})

	it('answers when the turn is stopped mid-search', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn<Fetched>(async (_url, sent) => {
				sent.signal?.throwIfAborted()

				return new Response(providerBody([]))
			}),
		)

		const outcome = await webSearch(withKey)?.(
			{ query: 'permit backlog' },
			AbortSignal.abort(),
		)

		expect(outcome?.status).toBe('unavailable')
	})

	// Nothing found is a search that worked, and reads differently to the model.
	it('is not what an empty result set is', async () => {
		vi.stubGlobal('fetch', answers(providerBody([])))

		const outcome = await webSearch(withKey)?.({ query: 'permit backlog' })

		expect(outcome).toEqual({ status: 'ok', results: [] })
	})
})
