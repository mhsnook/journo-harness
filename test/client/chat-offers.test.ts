import { describe, expect, it } from 'vitest'

import { readRecordedOffers, recordedOfferIds } from '../../src/client/chat/offers'
import { proposePlanChangeTool, recordOffersTool } from '../../src/shared/chat'
import { toolPart, transcript } from './chat-fixtures'

/**
 * A research turn writes Offer rows this client never asked for, and nothing on
 * the socket announces a row — §3. What the turn hands back is the only signal
 * the Ledger gets that its list moved.
 */

const part = (state: string, extra: Record<string, unknown> = {}) =>
	toolPart(recordOffersTool, state, { input: { offers: [] }, ...extra })

const recorded = [
	{ id: 'offer-a', name: 'A study', disposition: 'undecided', duplicate: false },
	{ id: 'offer-b', name: 'A quote', disposition: 'accepted', duplicate: true },
]

describe('a research turn', () => {
	it('hands back the ids the Ledger holds rows for', () => {
		const found = readRecordedOffers(
			part('output-available', { output: recorded }) as never,
		)

		expect(found).toEqual(recorded)
	})

	it('reads nothing off a call that has not resolved', () => {
		expect(readRecordedOffers(part('input-available') as never)).toBeNull()
	})

	it('reads nothing off a Proposal', () => {
		const proposal = toolPart(proposePlanChangeTool, 'output-available', {
			input: { ops: [] },
			output: 'done',
		})

		expect(readRecordedOffers(proposal as never)).toBeNull()
	})

	/** Two turns can offer the same source: the second comes back marked a
	 * duplicate, naming the row the first one wrote. */
	it('names each id once, in the order the turns recorded them', () => {
		const ids = recordedOfferIds([
			...transcript(part('output-available', { output: recorded })),
			{
				id: 'm-2',
				role: 'assistant',
				parts: [
					part('output-available', {
						toolCallId: 'call-3',
						output: [
							{ id: 'offer-b', disposition: 'accepted', duplicate: true },
							{ id: 'offer-c', disposition: 'undecided', duplicate: false },
						],
					}),
				],
			},
		])

		expect(ids).toEqual(['offer-a', 'offer-b', 'offer-c'])
	})
})
