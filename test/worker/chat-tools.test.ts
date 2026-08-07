import { describe, expect, it } from 'vitest'

import { chatTools } from '../../src/server/llm/tools'
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
