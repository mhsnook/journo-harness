import { applyD1Migrations, env } from 'cloudflare:test'

/**
 * The article index's schema, applied inside workerd once per test file.
 * `migrations_dir` in wrangler.jsonc is read by the CLI rather than by the test
 * pool, so vitest.config.ts reads the files and passes them as TEST_MIGRATIONS.
 */
if (env.TEST_MIGRATIONS === undefined) {
	throw new Error(
		'No TEST_MIGRATIONS binding — see the worker project in vitest.config.ts.',
	)
}

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
