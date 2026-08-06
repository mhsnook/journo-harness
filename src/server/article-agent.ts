import { Agent } from 'agents'

/**
 * One Article Agent per Article. It holds the Plan in Agent state, and the
 * Offers, Notes, and Rounds as rows in its own SQLite.
 *
 * Empty so far: the Plan schema, `validateStateChange`, and the Offer rows are
 * all still to come.
 */
export class ArticleAgent extends Agent<Env> {
  async onRequest(_request: Request): Promise<Response> {
    return Response.json({ agent: 'ArticleAgent', name: this.name })
  }
}
