import type { D1Migration } from 'cloudflare:test'

declare global {
	namespace Cloudflare {
		/** `env` in a worker test is `Cloudflare.Env`, so a test-only binding is
		 * declared here rather than in wrangler.jsonc. */
		interface Env {
			/** The article index's migration files, read in vitest.config.ts and
			 * applied by apply-migrations.ts. The deployed Worker has the schema
			 * already and never sees this.
			 *
			 * Optional, and genuinely so: the Worker's own `Env` has to satisfy
			 * `Cloudflare.Env`, and a required field here would stop it. The setup
			 * file throws on the absence rather than skipping the migration. */
			TEST_MIGRATIONS?: D1Migration[]
		}
	}
}
