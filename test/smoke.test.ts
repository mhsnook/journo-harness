import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

describe('the Worker', () => {
  it('serves the client at the root', async () => {
    const response = await SELF.fetch('https://harness.test/')

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('<div id="root">')
  })

  it('serves the client for a deep link, through the SPA fallback', async () => {
    const response = await SELF.fetch('https://harness.test/a/some-article')

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('<div id="root">')
  })

  it('reaches an ArticleAgent instance', async () => {
    const response = await SELF.fetch('https://harness.test/agents/article-agent/smoke')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      agent: 'ArticleAgent',
      name: 'smoke',
    })
  })

  // The request carries no Cf-Access-Jwt-Assertion header, because localhost
  // has no Access gate and so nothing may require one.
  it('answers the health route rather than the SPA fallback', async () => {
    const response = await SELF.fetch('https://harness.test/api/health')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
  })
})
