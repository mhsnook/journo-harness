import { getCurrentAgent } from 'agents'
import { tool, type ToolSet } from 'ai'
import { z } from 'zod'

import {
	proposePlanChangeInput,
	proposePlanChangeTool,
	recordedOffersOutput,
	recordOffersTool,
} from '../../shared/chat'
import { offerBatchSchema } from '../../shared/offer'
import { defaultResearchPolicy } from '../../shared/research'
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
 * The Offer tool below carries an `execute` instead, because an Offer is a row
 * the writer rules on later rather than mid-turn — §5.
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
	// An object at the top level, like the Proposal tool's input.
	inputSchema: z.strictObject({ offers: offerBatchSchema }),
	// The Chat Panel parses this output to find the rows a turn recorded, and
	// fails soft when it cannot — so bind both ends to the one schema.
	outputSchema: recordedOffersOutput,
	execute: async ({ offers }) => {
		// The module is imported once; the instance is per turn.
		const { agent } = getCurrentAgent<ArticleAgent>()
		if (agent === undefined)
			throw new Error('The Offer tool ran outside an Article Agent.')

		// The policy is passed here rather than asked of the model — the label is
		// what a comparison between research routines rests on, and a model
		// naming its own arm would be marking its own homework. One routine
		// serves every turn until a House Skill is one of its own at 1b.
		const { recorded } = await agent.recordOffers(offers, defaultResearchPolicy)

		return recorded.map(({ offer, duplicate }) => ({
			id: offer.id,
			name: offer.source?.title ?? offer.text,
			disposition: offer.disposition,
			duplicate,
		}))
	},
})

/** Typed as the whole `ToolSet` rather than inferred: the Proposal tool has no
 * `execute` and so no return type to infer, and the wide type is what lets the
 * Agent's `onFinish` callback fit `streamText`'s. */
export const chatTools: ToolSet = {
	[proposePlanChangeTool]: proposePlanChange,
	[recordOffersTool]: recordOffers,
}
