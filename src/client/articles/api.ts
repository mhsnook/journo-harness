import {
	type ArticleEdit,
	type ArticleEntry,
	articleListSchema,
	articleReplySchema,
} from '../../shared/article'

/**
 * The five HTTP calls §8 counts, three of which are these. The index is the one
 * store that is not reactive: it is read on demand through TanStack Query, where
 * the Plan arrives over the Article Agent's socket.
 *
 * Each answer is parsed rather than asserted. The Worker and the client share
 * one schema, so a route that drifts fails here with a sentence instead of
 * rendering a row with a missing field.
 */

const base = '/api/articles'

export async function fetchArticles(): Promise<ArticleEntry[]> {
	const answer = await send(base)

	return articleListSchema.parse(answer).articles
}

export async function createArticle(title?: string): Promise<ArticleEntry> {
	const answer = await send(base, 'POST', title === undefined ? {} : { title })

	return articleReplySchema.parse(answer).article
}

export async function editArticle(id: string, edit: ArticleEdit): Promise<ArticleEntry> {
	const answer = await send(`${base}/${encodeURIComponent(id)}`, 'PATCH', edit)

	return articleReplySchema.parse(answer).article
}

/** Throws a row away, for the new-Article dialog the writer backed out of. Not
 * Archiving, which is what putting a real Article away is. */
export async function discardArticle(id: string): Promise<void> {
	await send(`${base}/${encodeURIComponent(id)}`, 'DELETE')
}

async function send(url: string, method = 'GET', body?: unknown): Promise<unknown> {
	const response = await fetch(url, {
		method,
		...(body === undefined
			? {}
			: { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
	})

	if (!response.ok) throw new Error(await reasonFor(response))

	// A discard answers 204, and `json()` throws on an empty body.
	if (response.status === 204) return null

	return response.json()
}

/** The route's own sentence where it sent one, and the status where it did not —
 * an Access redirect answers HTML, and `response.json()` would throw on it. */
async function reasonFor(response: Response): Promise<string> {
	try {
		const body: unknown = await response.json()
		if (typeof body === 'object' && body !== null && 'error' in body) {
			return String(body.error)
		}
	} catch {
		/* Not JSON. The status below is all there is to say. */
	}

	return `The index answered ${response.status}.`
}
