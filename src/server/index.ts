// Nothing here parses a token. Cloudflare Access gates this Worker at the edge,
// and localhost has no Access gate — so requiring the Cf-Access-Jwt-Assertion
// header would make the app unrunnable in development.

import { routeAgentRequest } from 'agents'
import { Hono } from 'hono'
import { ArticleAgent } from './article-agent'

// Re-exported so the Durable Object class ships with the Worker bundle.
export { ArticleAgent }

const app = new Hono<{ Bindings: Env }>()

app.get('/api/health', (c) => c.json({ ok: true }))

// routeAgentRequest maps /agents/article-agent/:name onto the ArticleAgent
// binding — the path segment is the binding name in kebab-case.
app.all('/agents/*', async (c) => {
  const response = await routeAgentRequest(c.req.raw, c.env)
  return response ?? c.text('No such Agent route', 404)
})

// Without this, notFound below would answer an unknown /api path with the
// client and a 200.
app.all('/api/*', (c) => c.text('No such API route', 404))

// Any other path is a client route. In production the edge serves assets before
// the Worker runs, so this only fires under `SELF.fetch`, which skips the edge
// router. It reads as dead code and is not.
app.notFound((c) => c.env.ASSETS.fetch(c.req.raw))

export default app
