import { tool, type ToolSet } from 'ai'

import { proposePlanChangeInput, proposePlanChangeTool } from '../../shared/chat'

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
 * #28 adds an Offer tool here. That one does carry an `execute`, because
 * recording an Offer is a row on the Article Agent rather than something the
 * writer rules on mid-turn — so the invariant is per tool rather than for the
 * registry, and `getCurrentAgent()` from `agents` is how it reaches the
 * instance without this module taking the Durable Object as a parameter.
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
	].join('\n'),
	inputSchema: proposePlanChangeInput,
})

/** Typed as the whole `ToolSet` rather than inferred: nothing here has an
 * `execute`, so there is no return type to infer, and the wide type is what
 * lets the Agent's `onFinish` callback fit `streamText`'s. */
export const chatTools: ToolSet = { [proposePlanChangeTool]: proposePlanChange }
