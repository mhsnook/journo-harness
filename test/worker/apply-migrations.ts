import { applyD1Migrations, env } from 'cloudflare:test'

/**
 * The article index's schema, applied inside workerd before any worker test
 * runs. `migrations_dir` in wrangler.jsonc is read by the CLI rather than by the
 * test pool, so vitest.config.ts reads the files and hands them over as
 * TEST_MIGRATIONS.
 *
 * Storage is isolated per test file, so this runs once per file rather than
 * once per suite.
 */
if (env.TEST_MIGRATIONS === undefined) {
	throw new Error(
		'No TEST_MIGRATIONS binding — see the worker project in vitest.config.ts.',
	)
}

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
