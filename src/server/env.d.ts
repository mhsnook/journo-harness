/**
 * Bindings the Worker reads that `wrangler types` cannot see.
 *
 * It generates `Env` from `wrangler.jsonc`, so anything set outside that file —
 * a var or a secret put there from the CLI or the dashboard — is absent from
 * the generated type. Declaring it here merges with the generated interface
 * rather than replacing it.
 *
 * Optional, because it genuinely may be unset: a deployment that has not named
 * a Gateway, and every test, run without one.
 */
interface Env {
	/** The AI Gateway the model calls log through, set from the CLI. Unset
	 * attaches no Gateway. A Gateway that does not exist fails the call, so an
	 * unset value is the safe state rather than a degraded one. */
	AI_GATEWAY_ID?: string

	/** The search provider's key, set from the CLI as a secret. Unset gives the
	 * Chat no search tool and tells the guide it cannot browse, which is what a
	 * fresh clone and every test run as. `llm/search.ts` is the only thing that
	 * reads it. */
	EXA_API_KEY?: string
}
