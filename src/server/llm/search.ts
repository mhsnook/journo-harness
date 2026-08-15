import { z } from 'zod'

import {
	type WebSearchInput,
	type WebSearchOutput,
	type WebSearchResult,
} from '../../shared/chat'

/**
 * The whole search boundary — `docs/architecture.md` §7. One provider serves
 * every search, and this is the only place it is named.
 *
 * **Cloudflare has no web search index to query.** AI Search reads your own
 * data, Browser Rendering retrieves a url you already hold, and AI Gateway's
 * Web Search turns on the *upstream provider's* native search tool on an
 * inference call rather than offering a search endpoint. None of them
 * discovers a url for a Workers AI model, so discovery routes to a third party
 * and this module is where it goes.
 *
 * **It does not route through AI Gateway**, and cannot: the Gateway proxies
 * inference, not an arbitrary search API. So the key stays a Worker secret and
 * §7's unauthenticated Gateway is untouched by any of this.
 */

const endpoint = 'https://api.exa.ai/search'

/** Enough for the writer to rule on, short of the context a research turn
 * spends. The model can ask for up to ten. */
const defaultCount = 6

/** Per result. Highlights are the query-relevant passages off the page, so
 * this is the budget for the part of a page that becomes a Quote. Pulling a
 * page whole is Browser Rendering's job and a separate step. */
const excerptCharacters = 1200

/** A search that hangs would hold the turn open with the writer watching. */
const timeoutMs = 15_000

/** How much of a provider error to carry back. The model relays it to the
 * writer, so it wants to be a sentence rather than a page of HTML. */
const reasonCharacters = 300

/**
 * One search. Never rejects: a rejected `execute` ends the turn, and the turn
 * still owes the writer an answer — so a failure comes back as
 * `status: 'unavailable'` for the model to relay.
 */
export type WebSearch = (
	input: WebSearchInput,
	abortSignal?: AbortSignal,
) => Promise<WebSearchOutput>

/**
 * The search the Chat is given, or `undefined` where no key is set.
 *
 * Undefined rather than a function that always fails, because the tool
 * registry and the guide rules both read it: a deployment with no key offers
 * the model no search tool and tells it it cannot browse, rather than handing
 * it a tool that burns a turn to report its own absence.
 *
 * `EXA_API_KEY` is a secret set from the CLI rather than checked in — the same
 * argument as `AI_GATEWAY_ID`, and `wrangler.jsonc` carries it.
 */
export function webSearch(env: Env): WebSearch | undefined {
	const key = env.EXA_API_KEY
	if (!key) return undefined

	return (input, abortSignal) => runSearch(key, input, abortSignal)
}

async function runSearch(
	key: string,
	input: WebSearchInput,
	abortSignal?: AbortSignal,
): Promise<WebSearchOutput> {
	// Both signals, so the writer stopping the turn and the timeout each end
	// the request. `AbortSignal.any` ignores an undefined member, so the filter
	// is what keeps the outer signal optional.
	const signals = [AbortSignal.timeout(timeoutMs)]
	if (abortSignal !== undefined) signals.push(abortSignal)

	try {
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-api-key': key },
			body: JSON.stringify(searchRequest(input)),
			signal: AbortSignal.any(signals),
		})

		if (!response.ok) {
			const body = (await response.text()).slice(0, reasonCharacters).trim()

			return unavailable(`The search provider answered ${response.status}. ${body}`)
		}

		return { status: 'ok', results: readResults(await response.json()) }
	} catch (error) {
		// A DNS failure, a timeout, the writer stopping the turn, or a body that
		// is not JSON. All four are the same thing to the model: no results, and
		// a sentence saying why.
		return unavailable(error instanceof Error ? error.message : String(error))
	}
}

function unavailable(reason: string): WebSearchOutput {
	return { status: 'unavailable', reason }
}

/**
 * The provider's request body. Highlights rather than full page text: a
 * highlight is the passage that answers the query, where the text is the whole
 * page — and ten whole pages would cost the turn its context to say what six
 * passages already say.
 */
export function searchRequest(input: WebSearchInput): Record<string, unknown> {
	return {
		query: input.query,
		type: 'auto',
		numResults: input.count ?? defaultCount,
		...(input.since !== undefined && { startPublishedDate: input.since }),
		contents: {
			highlights: { maxCharacters: excerptCharacters, query: input.query },
		},
	}
}

/**
 * The provider's response, read loosely on purpose. Every field but the url is
 * optional at the source — a page with no byline has no author, and a
 * published date is estimated from the HTML rather than known — so a result
 * missing one is ordinary rather than a fault. A result missing its url is not
 * a result, and is dropped.
 *
 * Not strict, unlike everything the Plan parses: this is a third party's
 * response rather than our own data, and a field they add should not fail a
 * search that otherwise worked.
 */
const providerResult = z.object({
	url: z.url(),
	title: z.string().nullish(),
	author: z.string().nullish(),
	publishedDate: z.string().nullish(),
	highlights: z.array(z.string()).nullish(),
})

const providerResponse = z.object({ results: z.array(z.unknown()).nullish() })

export function readResults(body: unknown): WebSearchResult[] {
	const answered = providerResponse.safeParse(body)
	if (!answered.success) return []

	// Per result rather than as an array, so one malformed entry costs its own
	// row instead of the whole search.
	return (answered.data.results ?? []).flatMap((entry) => {
		const parsed = providerResult.safeParse(entry)

		return parsed.success ? [toResult(parsed.data)] : []
	})
}

type ProviderResult = z.infer<typeof providerResult>

function toResult(found: ProviderResult): WebSearchResult {
	// The provider dates a result as either YYYY-MM-DD or a full timestamp, and
	// an Offer's source carries a year. Ten characters is the date either way.
	const published = found.publishedDate?.slice(0, 10)
	const excerpt = (found.highlights ?? [])
		.map((highlight) => highlight.trim())
		.filter((highlight) => highlight !== '')
		.join(' … ')

	return {
		url: found.url,
		...(found.title && { title: found.title }),
		...(found.author && { author: found.author }),
		...(published && { published }),
		...(excerpt !== '' && { excerpt }),
	}
}
