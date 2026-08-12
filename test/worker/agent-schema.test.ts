import { env, evictDurableObject, runInDurableObject } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

import { agentSchemaVersion, migrateAgentSchema } from '../../src/server/agent-schema'
import { openAgentSocket } from './agent-socket'

/**
 * The migration runner — `src/server/agent-schema.ts`.
 *
 * The rule it exists for is not testable by inspection: `onStart` runs on every
 * wake, so a step that is not guarded throws the second time. These drive the
 * guard directly rather than waiting for a wake, because a wake is what the
 * runner has to survive and running it twice by hand is the same statement.
 */

/** `ctx` is protected on the Agent, and the test pool hands the same
 * `DurableObjectState` as the callback's second argument — which is how these
 * reach storage without opening a hole in the class for a test. */

/** Every table this Agent's storage carries, in name order. */
function tablesOf(name: string): Promise<string[]> {
	const stub = env.ArticleAgent.get(env.ArticleAgent.idFromName(name))

	return runInDurableObject(stub, (_agent, state) =>
		state.storage.sql
			.exec<{ name: string }>(
				`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
				 ORDER BY name`,
			)
			.toArray()
			.map((row) => row.name),
	)
}

function versionOf(name: string): Promise<number> {
	const stub = env.ArticleAgent.get(env.ArticleAgent.idFromName(name))

	return runInDurableObject(
		stub,
		(_agent, state) =>
			state.storage.sql
				.exec<{ version: number }>('SELECT version FROM agent_schema')
				.toArray()[0]?.version ?? 0,
	)
}

describe('the Article Agent schema runner', () => {
	it('builds every table and records the version it built them at', async () => {
		await openAgentSocket('schema-fresh')

		await expect(tablesOf('schema-fresh')).resolves.toEqual(
			expect.arrayContaining([
				'agent_schema',
				'offer',
				'offer_appearance',
				'offer_batch',
			]),
		)
		await expect(versionOf('schema-fresh')).resolves.toBe(agentSchemaVersion)
	})

	// The whole point of the version row. Every step's statements are written
	// plainly — `CREATE TABLE`, and one day `ALTER TABLE ADD COLUMN` — so a
	// second run that did not skip them would throw on the duplicate.
	it('runs nothing on a second pass, and leaves the version where it was', async () => {
		await openAgentSocket('schema-twice')
		const stub = env.ArticleAgent.get(env.ArticleAgent.idFromName('schema-twice'))

		const again = await runInDurableObject(stub, (_agent, state) =>
			migrateAgentSchema(state),
		)

		expect(again).toBe(agentSchemaVersion)
		await expect(versionOf('schema-twice')).resolves.toBe(agentSchemaVersion)
	})

	// What a deploy of this runner meets: an Agent built by the `onStart` that
	// came before it, carrying the offer table and no version row. Step 1 is the
	// baseline restated, so it has to be the no-op that lets one runner serve an
	// Agent that has the table and one that does not.
	it('migrates an Agent that predates it, keeping the rows it already had', async () => {
		const stub = env.ArticleAgent.get(env.ArticleAgent.idFromName('schema-legacy'))
		await openAgentSocket('schema-legacy')

		const offer = await runInDurableObject(stub, (agent) =>
			agent.createOffer({ type: 'link', source: { title: 'Already here' } }),
		)

		// Wind it back to what the old onStart left: the offer table with its
		// rows, and nothing that says how far it had got.
		await runInDurableObject(stub, (_agent, state) => {
			state.storage.sql.exec('DROP TABLE offer_appearance')
			state.storage.sql.exec('DROP TABLE offer_batch')
			state.storage.sql.exec('DROP TABLE agent_schema')
		})

		const version = await runInDurableObject(stub, (_agent, state) =>
			migrateAgentSchema(state),
		)

		expect(version).toBe(agentSchemaVersion)
		await expect(tablesOf('schema-legacy')).resolves.toEqual(
			expect.arrayContaining([
				'agent_schema',
				'offer',
				'offer_appearance',
				'offer_batch',
			]),
		)
		await expect(
			runInDurableObject(stub, (agent) => agent.listOffers()),
		).resolves.toEqual([offer])
	})

	it('is at the version its steps end on after a hibernation cycle', async () => {
		await openAgentSocket('schema-hibernation')
		await evictDurableObject(
			env.ArticleAgent.get(env.ArticleAgent.idFromName('schema-hibernation')),
		)

		// The wake runs onStart again, which runs the runner again.
		await openAgentSocket('schema-hibernation')

		await expect(versionOf('schema-hibernation')).resolves.toBe(agentSchemaVersion)
	})
})
