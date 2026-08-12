import { Hono } from 'hono'
import { z } from 'zod'

import { ruleEditSchema } from '../../shared/learning'
import { model } from '../llm/model'
import { policyTallies } from './appearances'
import { distilRules } from './distil'
import { listRules, restoreRule, setRuleDisposition } from './rules'

/**
 * Learning, over D1 — docs/architecture.md §12. Writer-scoped, so nothing here
 * takes an Article: one Article's rulings are too few to read a preference off,
 * and the question is what this writer takes rather than what this piece needed.
 *
 * HTTP rather than the Article Agent's socket, for the same reason the article
 * index is HTTP: this material outlives any one Article and belongs to none of
 * them. Nothing parses a token — Access gates the Worker at the edge (§9).
 */
export const learning = new Hono<{ Bindings: Env }>()

	/** Every Learned rule, whatever the writer decided. */
	.get('/rules', async (c) => {
		return c.json({ rules: await listRules(c.env.DB) })
	})

	/**
	 * Run one distillation pass and record what it produced.
	 *
	 * An action rather than CRUD, because it runs a model (§3, rule 3). Too few
	 * rulings answers 409 with the count and the floor, so the caller can say how
	 * far off it is rather than only that it failed.
	 */
	.post('/rules/distil', async (c) => {
		const result = await distilRules(c.env.DB, model(c.env))

		if (result.type === 'too_little') {
			return c.json(
				{
					error: `${result.ruled} ruled Offers is too few to read a preference off. The pass needs ${result.needed}.`,
					ruled: result.ruled,
					needed: result.needed,
				},
				409,
			)
		}

		return c.json({ rules: result.rules, observed: result.observed }, 201)
	})

	/** Accept a rule, Decline it, or restore a Declined one. */
	.patch('/rules/:id', async (c) => {
		const sent = ruleEditSchema.safeParse(await body(c.req.raw))
		if (!sent.success) return c.json({ error: z.prettifyError(sent.error) }, 400)

		const id = c.req.param('id')
		const rule =
			'restore' in sent.data
				? await restoreRule(c.env.DB, id)
				: await setRuleDisposition(c.env.DB, id, sent.data.ruling)

		// A restore that matched nothing is either a rule that does not exist or
		// one that is not Declined, and the two cannot be told apart from the
		// UPDATE alone. The sentence covers both rather than claiming the wrong one.
		if (rule === null) {
			return c.json(
				{
					error:
						'restore' in sent.data
							? 'No Declined rule carries that id. Restoring undoes a Decline.'
							: 'No Learned rule carries that id.',
				},
				404,
			)
		}

		return c.json({ rule })
	})

	/**
	 * What each research policy has turned up and what became of it.
	 *
	 * The report that answers which research routine is worth keeping — write a
	 * second policy, let both run, and read this.
	 */
	.get('/policies', async (c) => {
		return c.json({ policies: await policyTallies(c.env.DB) })
	})

/** A POST with no body is the ordinary way to run the pass, and `json()` throws
 * on one — the same helper the article index needs. */
async function body(request: Request): Promise<unknown> {
	try {
		return await request.json()
	} catch {
		return {}
	}
}
