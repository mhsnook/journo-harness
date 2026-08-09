import type { D1Migration } from 'cloudflare:test'

declare global {
	namespace Cloudflare {
		/** `env` in a worker test is `Cloudflare.Env`, so a test-only binding goes
		 * here rather than in wrangler.jsonc. */
		interface Env {
			/** Optional, and genuinely so: the Worker's own `Env` has to satisfy
			 * `Cloudflare.Env`, and a required field would stop it. apply-migrations
			 * throws on the absence rather than skipping the migration. */
			TEST_MIGRATIONS?: D1Migration[]
		}
	}
}
