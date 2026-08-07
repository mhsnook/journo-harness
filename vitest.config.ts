import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import agents from 'agents/vite'
import { defineConfig } from 'vitest/config'

// Two projects, split by what the code under test needs. A test in test/shared
// runs in node against a pure module; a test in test/worker runs in workerd
// with the bindings. `pnpm test:shared` skips the Vite build and workerd
// startup, which is most of the time a shared test takes.
export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: 'shared',
					include: ['test/shared/**/*.test.ts'],
					environment: 'node',
				},
			},
			{
				plugins: [
					// Cloudflare's workaround for `@callable` support in Vite 8.
					agents(),
					// `cloudflareTest` is the current API. Most docs still show
					// `defineWorkersConfig` with `poolOptions.workers`, which no longer
					// resolves — the package stopped exporting "./config".
					cloudflareTest({
						wrangler: { configPath: './wrangler.jsonc' },
						// The AI binding is the only remote-only one and no test calls a
						// model, so keep everything in the local workerd rather than making
						// `pnpm test` need an API token.
						remoteBindings: false,
					}),
				],
				test: {
					name: 'worker',
					include: ['test/worker/**/*.test.ts'],
				},
			},
		],
	},
})
