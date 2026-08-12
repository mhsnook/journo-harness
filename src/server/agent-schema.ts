/**
 * The Article Agent's SQLite schema, and the runner that brings a woken Agent
 * up to it — docs/architecture.md §3.
 *
 * `onStart` runs on every wake, so `CREATE TABLE IF NOT EXISTS` was enough
 * while every change added a table. A column is where that stops working:
 * SQLite has no ADD COLUMN IF NOT EXISTS, so the second wake throws on the
 * duplicate. The version row below is what makes a step run once — an Agent
 * records the last step it ran, and a wake runs only what comes after it.
 *
 * **Steps are append-only.** A deployed Agent has already run the ones it
 * carries, so editing a step changes what a fresh Agent builds without
 * changing what an old one holds, and the two stop agreeing with no error to
 * say so. Correct a step by adding the one that fixes it.
 *
 * **An Agent that predates this runner starts at version 0**, which is why
 * step 1 restates the `offer` table with `IF NOT EXISTS` rather than assuming
 * it. Running the baseline over an Agent that already has the table is the
 * no-op that lets one runner serve both.
 *
 * The steps take a plain SQL string rather than the Agent's `sql` tagged
 * template, because a migration is a fixed statement with nothing to bind and
 * `ctx.storage.sql.exec` is what takes one.
 */

/** One step, run whole or not at all. The version is what an Agent records
 * once every statement in it has run. */
type SchemaStep = {
	version: number
	statements: string[]
}

/** Where an Agent records how far it has got. Created before anything reads
 * it, so version 0 means a table with no row rather than a missing table. */
const versionTable = `
	CREATE TABLE IF NOT EXISTS agent_schema (
		version INTEGER NOT NULL
	)
`

const steps: SchemaStep[] = [
	{
		// The baseline — the `offer` table as it stood before this runner.
		version: 1,
		statements: [
			`CREATE TABLE IF NOT EXISTS offer (
				seq INTEGER PRIMARY KEY AUTOINCREMENT,
				id TEXT NOT NULL UNIQUE,
				type TEXT NOT NULL,
				disposition TEXT NOT NULL,
				text TEXT,
				source TEXT,
				note TEXT,
				created_at INTEGER NOT NULL,
				decided_at INTEGER
			)`,
		],
	},
	{
		// What a research turn was, and what it put in front of the writer.
		//
		// A batch is one call to the research tool. An appearance is one Offer
		// surfaced in one batch, and the two are separate tables because a
		// re-offer has to count: an Offer the writer already ruled on writes no
		// second row (§5), so a second policy turning up the same source would
		// otherwise leave no trace of having turned it up. Appearances are what
		// make "which policy surfaced this" answerable, and comparing policies is
		// the whole point of naming one.
		version: 2,
		statements: [
			// `seq` orders it, not `created_at`, for the reason the offer table
			// carries one: a Worker's clock does not advance across local writes,
			// so two turns in one invocation land on the same millisecond.
			`CREATE TABLE offer_batch (
				seq INTEGER PRIMARY KEY AUTOINCREMENT,
				id TEXT NOT NULL UNIQUE,
				policy TEXT NOT NULL,
				created_at INTEGER NOT NULL,
				offered INTEGER NOT NULL
			)`,
			// The position is the order the writer saw them in, so (batch,
			// position) is the key. One batch may surface one Offer twice — the
			// model repeating itself within a turn — and those are two
			// appearances at two positions, the second marked a duplicate.
			`CREATE TABLE offer_appearance (
				batch_id TEXT NOT NULL,
				offer_id TEXT NOT NULL,
				position INTEGER NOT NULL,
				duplicate INTEGER NOT NULL,
				PRIMARY KEY (batch_id, position)
			)`,
			`CREATE INDEX offer_appearance_offer ON offer_appearance (offer_id)`,
		],
	},
]

/** The version a fully migrated Agent carries. Read off the steps rather than
 * stated, so adding one cannot leave this behind. */
export const agentSchemaVersion = steps[steps.length - 1].version

/**
 * Bring one Agent's storage up to `agentSchemaVersion`, and answer with the
 * version it now carries. Runs on every wake, and does nothing on all but the
 * first wake after a deploy that added a step.
 *
 * Each step runs inside `transactionSync`, so a step that throws part way
 * leaves neither its tables nor its version behind and the next wake runs it
 * again from the top. That is what lets a statement be written plainly instead
 * of defensively.
 */
export function migrateAgentSchema(ctx: DurableObjectState): number {
	const sql = ctx.storage.sql
	sql.exec(versionTable)

	const [row] = sql
		.exec<{ version: number }>('SELECT version FROM agent_schema')
		.toArray()
	let version = row?.version ?? 0

	for (const step of steps) {
		if (step.version <= version) continue

		ctx.storage.transactionSync(() => {
			for (const statement of step.statements) sql.exec(statement)

			// DELETE then INSERT rather than UPDATE: version 0 is a table with no
			// row, and one statement cannot both write the first row and replace
			// the one after it.
			sql.exec('DELETE FROM agent_schema')
			sql.exec('INSERT INTO agent_schema (version) VALUES (?)', step.version)
		})

		version = step.version
	}

	return version
}
