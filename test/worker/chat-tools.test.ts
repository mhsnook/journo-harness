import { describe, expect, it } from 'vitest'

import { chatTools, recordOffersTool } from '../../src/server/llm/tools'
import { proposePlanChangeTool } from '../../src/shared/chat'
import { chatOpNames } from '../../src/shared/plan'

/**
 * The Proposal tool's description is a string, so nothing typechecks it against
 * the schema declared beside it. This is what does: an op added to the schema
 * reaches the model whether or not anything tells the model what it does.
 */
describe('the Proposal tool', () => {
	// The SDK types a description as a string or a function that builds one.
	// Ours is a string, and a test that reads it says so rather than guessing.
	const described = chatTools[proposePlanChangeTool].description
	const description = typeof described === 'string' ? described : ''

	it('teaches every op it offers', () => {
		const taught = chatOpNames.filter((op) => description.includes(op))

		expect(taught).toEqual(chatOpNames)
	})

	// The other half of the same rule. Research reaches the Plan by the writer
	// Accepting an Offer — architecture §5 — so the ops that put a Reference in
	// the Plan are neither offered nor described.
	it('teaches no op it does not offer', () => {
		for (const op of ['createReference', 'deleteReference', 'setReference']) {
			expect(description).not.toContain(op)
		}
	})
})

/**
 * The suspend-or-execute rule is per tool rather than for the registry. A tool
 * with no `execute` suspends for the client, and that suspension is the
 * Proposal the writer rules on. An Offer is a row instead: nothing suspends,
 * and the writer rules on it later in the Offer ledger.
 */
describe('the Offer tool', () => {
	it('runs on the server, where the Proposal tool suspends', () => {
		expect(chatTools[proposePlanChangeTool].execute).toBeUndefined()
		expect(chatTools[recordOffersTool].execute).toBeTypeOf('function')
	})

	// The one rule the schema does not carry is worth stating.
	it('teaches that Offers are flat', () => {
		const described = chatTools[recordOffersTool].description

		expect(typeof described === 'string' ? described : '').toContain('Offers are flat')
	})
})
