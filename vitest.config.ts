import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

// `cloudflareTest` is the current API. Most docs still show `defineWorkersConfig`
// with `poolOptions.workers`, which no longer resolves — the package stopped
// exporting "./config".
export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: './wrangler.jsonc' },
			// The AI binding is the only remote-only one and no test calls a model,
			// so keep everything in the local workerd rather than making `pnpm test`
			// need an API token.
			remoteBindings: false,
		}),
	],
	test: {
		include: ['test/**/*.test.ts'],
	},
})
