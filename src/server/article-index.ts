import { Hono } from 'hono'
import { z } from 'zod'

import {
	ARTICLE_STATUSES,
	type ArticleEntry,
	articleEditSchema,
	type ArticleStatus,
	newArticleSchema,
} from '../shared/article'

/**
 * The article index, over D1 — docs/architecture.md §9, issue #29.
 *
 * A small table on the HTTP path §2 already has for the Archived reads. It does
 * not wait for the House, and it holds no per-Article material: everything about
 * one Article is in its Article Agent, and nothing here reaches into one.
 * Removing a row leaves the Article Agent exactly as it was.
 *
 * Nothing here parses a token. Cloudflare Access gates the Worker at the edge,
 * and 1a may not require the Cf-Access-Jwt-Assertion header (§9).
 */

/** One row as D1 returns it. The `status` column is stated as what the two write
 * routes parsed before writing it, rather than checked again on the way out —
 * these routes are the table's only writer, the same argument `OfferRow` makes
 * in the Article Agent. */
type ArticleRow = {
	id: string
	title: string
	status: ArticleStatus
	created_at: number
	updated_at: number
	archived_at: number | null
}

const columns = 'id, title, status, created_at, updated_at, archived_at'

function toEntry(row: ArticleRow): ArticleEntry {
	return {
		id: row.id,
		title: row.title,
		status: row.status,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		archivedAt: row.archived_at,
	}
}

export const articleIndex = new Hono<{ Bindings: Env }>()

	/**
	 * Every Article, Archived ones included, newest change first. The two Views
	 * filter what they show, because one Team's index is small enough to send
	 * whole and an Archive View costs no second request that way. Paginate here
	 * if the table ever outgrows one response.
	 */
	.get('/', async (c) => {
		const rows = await c.env.DB.prepare(
			`SELECT ${columns} FROM article ORDER BY updated_at DESC`,
		).all<ArticleRow>()

		return c.json({ articles: rows.results.map(toEntry) })
	})

	/**
	 * A new Article: a new id and a row, and the client redirects into it. The
	 * Article Agent is not woken here — it builds itself on the first connect,
	 * with the empty Plan its `initialState` carries.
	 */
	.post('/', async (c) => {
		const sent = newArticleSchema.safeParse(await body(c.req.raw))
		if (!sent.success) return c.json({ error: z.prettifyError(sent.error) }, 400)

		const now = Date.now()
		const row = await c.env.DB.prepare(
			`INSERT INTO article (${columns}) VALUES (?, ?, ?, ?, ?, NULL) RETURNING ${columns}`,
		)
			.bind(crypto.randomUUID(), sent.data.title ?? '', ARTICLE_STATUSES[0], now, now)
			.first<ArticleRow>()

		if (row === null) return c.json({ error: 'The Article was not created.' }, 500)

		return c.json({ article: toEntry(row) }, 201)
	})

	/**
	 * Rename, restatus, Archive, or restore. The title arrives here after the
	 * Plan write it copies, so a failed write leaves a stale row that the next
	 * rename corrects — §5 argues the same order for Accepting an Offer.
	 */
	.patch('/:id', async (c) => {
		const sent = articleEditSchema.safeParse(await body(c.req.raw))
		if (!sent.success) return c.json({ error: z.prettifyError(sent.error) }, 400)

		const { title, status, archived } = sent.data
		const assignments: string[] = ['updated_at = ?']
		const values: (string | number | null)[] = [Date.now()]

		if (title !== undefined) {
			assignments.push('title = ?')
			values.push(title)
		}
		if (status !== undefined) {
			assignments.push('status = ?')
			values.push(status)
		}
		if (archived !== undefined) {
			assignments.push('archived_at = ?')
			values.push(archived ? Date.now() : null)
		}

		const row = await c.env.DB.prepare(
			`UPDATE article SET ${assignments.join(', ')} WHERE id = ? RETURNING ${columns}`,
		)
			.bind(...values, c.req.param('id'))
			.first<ArticleRow>()

		if (row === null) return c.json({ error: 'No Article carries that id.' }, 404)

		return c.json({ article: toEntry(row) })
	})

	/**
	 * Throw a row away. This is not Archiving, and it is not for an Article the
	 * writer has worked in: it is how the new-Article dialog cleans up the row it
	 * opened when the writer changes their mind before naming it. Nothing is
	 * destroyed, because there is nothing there — the Article Agent is not woken
	 * until the Article screen connects to it, and removing a row never reaches
	 * one either way.
	 */
	.delete('/:id', async (c) => {
		const removed = await c.env.DB.prepare('DELETE FROM article WHERE id = ?')
			.bind(c.req.param('id'))
			.run()

		if (removed.meta.changes === 0) {
			return c.json({ error: 'No Article carries that id.' }, 404)
		}

		return c.body(null, 204)
	})

/** The parsed body, or an empty object where there is none. A POST with no body
 * is the ordinary way to open an Article, and `req.json()` throws on one. */
async function body(request: Request): Promise<unknown> {
	try {
		return await request.json()
	} catch {
		return {}
	}
}
