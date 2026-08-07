import { getCurrentAgent } from 'agents'
import { tool, type ToolSet } from 'ai'

import { proposePlanChangeInput, proposePlanChangeTool } from '../../shared/chat'
import { offerBatchSchema } from '../../shared/offer'
import type { ArticleAgent } from '../article-agent'

/**
 * The tools a Chat turn is given, and the descriptions that teach a model to
 * use them. The name and the input schema are `src/shared/chat.ts`, because
 * the Chat Panel matches on both.
 *
 * The Proposal tool is **`execute`-less**: a tool with no `execute` suspends
 * for the client, and that suspension is the Proposal the writer rules on —
 * `docs/architecture.md` §6. It writes nothing, because the Chat proposes and
 * the client applies (§3, rule 4).
 *
 * Do not reach for `needsApproval` or `toolApproval`. Both gate a server-side
 * `execute` this product does not have.
 *
 * The Offer tool below is the exception, and carries an `execute`. Recording
 * an Offer is a row on the Article Agent rather than something the writer rules
 * on mid-turn, so the suspension would buy nothing and cost the turn: a
 * research turn returns seventeen items, and an unruled tool batch stalls the
 * Chat with no orphan timeout (§11). The writer rules later, in the Offer
 * ledger, and the row waits for them.
 */

const proposePlanChange = tool({
	description: [
		'Propose a change to the Plan for the writer to Accept or Decline.',
		'The ops apply all-or-nothing, in the order given. You never write the Plan yourself.',
		'',
		'A content op - setTitle, setIntent, setTarget, setVoice, setAdjectives - carries an',
		'"expected" field, the value you believe is there now, compared whole-field. Read it off',
		'the Plan you were given. On a content op, "nodeId": null means the Article rather than',
		'one Section.',
		'',
		'A structural op - createNode, moveNode - anchors on ids and states exactly one of',
		'"afterId" and "beforeId": name whichever neighbour the change relates to, so the op',
		'survives the other neighbour being deleted. "afterId": null means first child, and',
		'"beforeId": null means last child.',
		'',
		'deleteNode unplaces every Reference placed at the node it removes and at any node below',
		"it. mergeNodes keeps the target's own fields, so carry the source's intent note over",
		'with a setIntent op in the same batch when you want it kept.',
		'',
		'placeReference puts a Reference the writer has already Accepted at a Section, and',
		'"value": null takes it off the one it sits at. Its "expected" is where it sits now, which',
		'is null while it is unplaced. You cannot add a Reference to the Plan: research reaches it',
		'by the writer Accepting an Offer.',
	].join('\n'),
	inputSchema: proposePlanChangeInput,
})

const recordOffers = tool({
	description: [
		'Record what research turned up, as Offers for the writer to Accept or Decline later.',
		'This writes nothing to the Plan: an Offer is an inert row, and only the writer moves',
		'one into the Plan. Call it once per turn with everything worth showing.',
		'',
		'Offers are flat. Two passages pulled from one publication are two Offers, each of',
		'type "quote" carrying its own "text" - never one Offer holding several. A "link" is',
		'something to draw on, named rather than quoted, and carries a "source". Every Offer',
		'carries a text, a source, or both.',
		'',
		'Offer the same source again freely: an entry this Article already carries comes back',
		'marked a duplicate, keeping whatever the writer already decided about it, and no',
		'second row is written.',
	].join('\n'),
	inputSchema: offerBatchSchema,
	execute: async (batch) => {
		// The Agent rather than a parameter: this module is imported once, and the
		// instance is whichever one is running the turn.
		const { agent } = getCurrentAgent<ArticleAgent>()
		if (agent === undefined)
			throw new Error('The Offer tool ran outside an Article Agent.')

		return agent.recordOffers(batch).map(({ offer, duplicate }) => ({
			id: offer.id,
			name: offer.source?.title ?? offer.text,
			disposition: offer.disposition,
			duplicate,
		}))
	},
})

/** The name the Offer tool is registered under. The Chat Panel does not match
 * on it — this one resolves server-side — so it does not live in shared/chat.ts
 * the way the Proposal tool's name does. */
export const recordOffersTool = 'recordOffers'

/** Typed as the whole `ToolSet` rather than inferred: the Proposal tool has no
 * `execute` and so no return type to infer, and the wide type is what lets the
 * Agent's `onFinish` callback fit `streamText`'s. */
export const chatTools: ToolSet = {
	[proposePlanChangeTool]: proposePlanChange,
	[recordOffersTool]: recordOffers,
}
