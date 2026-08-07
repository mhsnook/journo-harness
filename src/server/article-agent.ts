import { Agent } from 'agents'

/**
 * One Article Agent per Article — docs/architecture.md §2, and §3 for what goes
 * in the state blob against what goes in its SQLite.
 *
 * Empty so far: `validateStateChange`, which runs `planSchema` from
 * `src/shared/plan`, and the Offer rows.
 */
export class ArticleAgent extends Agent<Env> {
	async onRequest(_request: Request): Promise<Response> {
		return Response.json({ agent: 'ArticleAgent', name: this.name })
	}
}
