import { z } from 'zod'

import {
	adjectiveSchema,
	idSchema,
	intentSchema,
	outlineNodeSchema,
	targetSchema,
	voiceSchema,
} from './schema'

/**
 * The vocabulary a Proposal is written in. Ten ops, named after the typed
 * document-operation API in #1 and applied on the client: the Chat proposes and
 * the client applies, so these payloads are the only thing a model emits that
 * reaches the Plan.
 *
 * Two shapes, and the split is deliberate.
 *
 * - A **structural** op anchors on IDs and carries no `expected`. It states
 *   exactly one of `afterId` or `beforeId`, so a Proposal anchors to whichever
 *   neighbour its insertion relates to and survives the other one being deleted.
 *   `afterId: null` means first child and `beforeId: null` means last child;
 *   neither names a sibling, so neither can go stale.
 * - A **content** op carries `expected` and `value`, compared whole-field.
 *   `nodeId: null` is the Article Scope, so setting the Article's Voice and
 *   setting one node's Voice are one op rather than two.
 *
 * **The payloads are strict, and a rejected tool call retries with the
 * validation error.** These schemas and the piece schemas they reuse are
 * `strictObject`, so a model that adds one field fails the whole tool call
 * rather than having the field stripped. If a model adds the same field every
 * turn it will thrash that retry, and the answer is naming the field here
 * rather than loosening every payload to strip. Reasoning in
 * `docs/architecture.md` §6.
 */

/** The anchor a structural op states, and what the applier reads. Both keys are
 * optional and nullable, because `afterId: null` and an absent `afterId` mean
 * different things: first child, against "this op anchors on beforeId". */
export type Anchor = { afterId?: string | null; beforeId?: string | null }

const anchorFields = {
	afterId: idSchema.nullable().optional(),
	beforeId: idSchema.nullable().optional(),
}

const anchorRule = {
	error: 'A structural op states exactly one of afterId and beforeId.',
}

function statesOneAnchor(op: Anchor) {
	return (op.afterId !== undefined) !== (op.beforeId !== undefined)
}

// Which Scope a content op acts on: an Outline node, or the Article itself.
const scopeIdSchema = idSchema.nullable()

// Where a structural op puts a node: under an Outline node, or at the root of
// the Outline. Null means the Outline here, not the Article.
const parentIdSchema = idSchema.nullable()

/** Insert a new Outline node. The payload is `outlineNodeSchema` whole, so a
 * leaf states `children: []` and a Proposal may create a subtree in one op. */
export const createNodeOpSchema = z
	.strictObject({
		op: z.literal('createNode'),
		parentId: parentIdSchema,
		node: outlineNodeSchema,
		...anchorFields,
	})
	.refine(statesOneAnchor, anchorRule)

/** Move a node, with its subtree, under a new parent. */
export const moveNodeOpSchema = z
	.strictObject({
		op: z.literal('moveNode'),
		nodeId: idSchema,
		parentId: parentIdSchema,
		...anchorFields,
	})
	.refine(statesOneAnchor, anchorRule)

/** Fold one node into another. `intoId` keeps its own fields and gains the
 * children and the placed References of `nodeId`, which disappears. A Proposal
 * that wants the merged intent note carried over says so with a `setIntent` op
 * in the same batch. */
export const mergeNodesOpSchema = z.strictObject({
	op: z.literal('mergeNodes'),
	nodeId: idSchema,
	intoId: idSchema,
})

/** Delete a node and its subtree. Every Reference placed at a deleted node is
 * unplaced in the same op, because the Plan is written whole and a Reference
 * naming a node that is gone does not parse. */
export const deleteNodeOpSchema = z.strictObject({
	op: z.literal('deleteNode'),
	nodeId: idSchema,
})

/** Retitle the Article or one node. A title may be empty, so neither side is
 * nullable. */
export const setTitleOpSchema = z.strictObject({
	op: z.literal('setTitle'),
	nodeId: scopeIdSchema,
	expected: z.string(),
	value: z.string(),
})

/** Set a node's intent note, or null to clear it. The Article carries no intent
 * note, so this op takes a node. */
export const setIntentOpSchema = z.strictObject({
	op: z.literal('setIntent'),
	nodeId: idSchema,
	expected: intentSchema.nullable(),
	value: intentSchema.nullable(),
})

/** Set the Article's total or one node's target, or null to clear it. */
export const setTargetOpSchema = z.strictObject({
	op: z.literal('setTarget'),
	nodeId: scopeIdSchema,
	expected: targetSchema.nullable(),
	value: targetSchema.nullable(),
})

/** Set the Voice at one Scope, or null to state none there. */
export const setVoiceOpSchema = z.strictObject({
	op: z.literal('setVoice'),
	nodeId: scopeIdSchema,
	expected: voiceSchema.nullable(),
	value: voiceSchema.nullable(),
})

/** Replace the Adjectives at one Scope. A Scope stating none reads as the empty
 * list on both sides, so there is no null spelling here. */
export const setAdjectivesOpSchema = z.strictObject({
	op: z.literal('setAdjectives'),
	nodeId: scopeIdSchema,
	expected: z.array(adjectiveSchema),
	value: z.array(adjectiveSchema),
})

/** Place a Reference at a node, or null to unplace it. `expected` names the
 * node the Reference sits at now. */
export const placeReferenceOpSchema = z.strictObject({
	op: z.literal('placeReference'),
	referenceId: idSchema,
	expected: idSchema.nullable(),
	value: idSchema.nullable(),
})

export const proposalOpSchema = z.discriminatedUnion('op', [
	createNodeOpSchema,
	moveNodeOpSchema,
	mergeNodesOpSchema,
	deleteNodeOpSchema,
	setTitleOpSchema,
	setIntentOpSchema,
	setTargetOpSchema,
	setVoiceOpSchema,
	setAdjectivesOpSchema,
	placeReferenceOpSchema,
])

/** A Proposal: a list of ops the applier applies all-or-nothing. An empty list
 * changes nothing, so it is not a Proposal. */
export const proposalSchema = z.array(proposalOpSchema).min(1)

export type ProposalOp = z.infer<typeof proposalOpSchema>
export type Proposal = z.infer<typeof proposalSchema>
export type OpName = ProposalOp['op']
