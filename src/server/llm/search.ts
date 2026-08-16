import { z } from 'zod'

import {
	type WebSearchInput,
	type WebSearchOutput,
	type WebSearchResult,
} from '../../shared/chat'

/**
 * Web search, over Exa's `POST /search` — `docs/architecture.md` §7. The only
 * place a search provider is named.
 */

const endpoint = 'https://api.exa.ai/search'
const defaultCount = 6
const excerptCharacters = 1200
const timeoutMs = 15_000

/** How much of a provider error to carry back. It reaches the writer through
 * the model's reply, so it wants to be a sentence rather than a page. */
const reasonCharacters = 300

/** Never rejects. A rejected tool `execute` ends the turn, so a failure comes
 * back as `status: 'unavailable'` instead. */
export type WebSearch = (
	input: WebSearchInput,
	abortSignal?: AbortSignal,
) => Promise<WebSearchOutput>

/** Undefined where no key is set, which `chatTools` reads to leave the search
 * tool out of the registry and `chatSystemPrompt` reads to tell the guide it
 * cannot browse. */
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
		// A timeout, a transport failure, the writer stopping the turn, or a body
		// that is not JSON.
		return unavailable(error instanceof Error ? error.message : String(error))
	}
}

function unavailable(reason: string): WebSearchOutput {
	return { status: 'unavailable', reason }
}

/** Highlights and not `text`: a highlight is the passage that answers the
 * query, where the text is the whole page. */
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

/** Loose rather than strict, unlike everything the Plan parses: a field the
 * provider adds should not fail a search that otherwise worked. Every field but
 * the url is optional at the source — a page with no byline has no author. */
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

	// Parsed per result, so one malformed entry costs its own row rather than
	// the whole search.
	return (answered.data.results ?? []).flatMap((entry) => {
		const parsed = providerResult.safeParse(entry)

		return parsed.success ? [toResult(parsed.data)] : []
	})
}

type ProviderResult = z.infer<typeof providerResult>

function toResult(found: ProviderResult): WebSearchResult {
	// The provider sends either YYYY-MM-DD or a full timestamp.
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
