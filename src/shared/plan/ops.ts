import { z } from 'zod'

import type { OutlineNode } from './schema'
import {
	adjectiveSchema,
	idSchema,
	intentSchema,
	outlineNodeSchema,
	targetSchema,
	voiceSchema,
} from './schema'

/**
 * The op vocabulary a Proposal is written in. What the ops mean, how strict the
 * payloads are, and what to do when a model fights that strictness are all
 * `docs/architecture.md` §6. The applier is apply.ts.
 */

/** Nullable and optional say different things: `afterId: null` is first child,
 * and an absent `afterId` is an op anchored on `beforeId`. */
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

// The two nullable ids below are the same schema and not the same field: null
// is the Article for a content op, and the root of the Outline for a
// structural one.
const scopeIdSchema = idSchema.nullable()
const parentIdSchema = idSchema.nullable()

/**
 * The node a `createNode` op carries: `outlineNodeSchema` loosened at its two
 * list fields, so a model is never made to state one empty list while being
 * refused the other. `children` may be left out and `adjectives` may arrive
 * empty; the applier writes the Plan's spelling of both.
 *
 * The leniency lives here rather than on `outlineNodeSchema` because
 * `validateStateChange` guards a write without rewriting it — a default there
 * would let a node reach the blob carrying no `children` key at all, which
 * every reader of a Plan assumes it has.
 */
export const createdNodeSchema: z.ZodType<OutlineNode, CreatedNode> =
	outlineNodeSchema.extend({
		adjectives: z.array(adjectiveSchema).optional(),
		get children() {
			return z.array(createdNodeSchema).default([])
		},
	})

type CreatedNode = Omit<OutlineNode, 'children'> & { children?: CreatedNode[] }

export const createNodeOpSchema = z
	.strictObject({
		op: z.literal('createNode'),
		parentId: parentIdSchema,
		node: createdNodeSchema,
		...anchorFields,
	})
	.refine(statesOneAnchor, anchorRule)

export const moveNodeOpSchema = z
	.strictObject({
		op: z.literal('moveNode'),
		nodeId: idSchema,
		parentId: parentIdSchema,
		...anchorFields,
	})
	.refine(statesOneAnchor, anchorRule)

export const mergeNodesOpSchema = z.strictObject({
	op: z.literal('mergeNodes'),
	nodeId: idSchema,
	intoId: idSchema,
})

export const deleteNodeOpSchema = z.strictObject({
	op: z.literal('deleteNode'),
	nodeId: idSchema,
})

/** A title may be empty, so neither side is nullable. */
export const setTitleOpSchema = z.strictObject({
	op: z.literal('setTitle'),
	nodeId: scopeIdSchema,
	expected: z.string(),
	value: z.string(),
})

/** The Article carries no intent note, so this op takes a node rather than a
 * Scope. */
export const setIntentOpSchema = z.strictObject({
	op: z.literal('setIntent'),
	nodeId: idSchema,
	expected: intentSchema.nullable(),
	value: intentSchema.nullable(),
})

export const setTargetOpSchema = z.strictObject({
	op: z.literal('setTarget'),
	nodeId: scopeIdSchema,
	expected: targetSchema.nullable(),
	value: targetSchema.nullable(),
})

export const setVoiceOpSchema = z.strictObject({
	op: z.literal('setVoice'),
	nodeId: scopeIdSchema,
	expected: voiceSchema.nullable(),
	value: voiceSchema.nullable(),
})

/** A Scope stating no Adjectives reads as the empty list on both sides, so
 * there is no null spelling here. */
export const setAdjectivesOpSchema = z.strictObject({
	op: z.literal('setAdjectives'),
	nodeId: scopeIdSchema,
	expected: z.array(adjectiveSchema),
	value: z.array(adjectiveSchema),
})

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

/** The whole Proposal, applied as one ordered batch. An empty list is not one. */
export const proposalSchema = z.array(proposalOpSchema).min(1)

export type ProposalOp = z.infer<typeof proposalOpSchema>
export type Proposal = z.infer<typeof proposalSchema>
export type OpName = ProposalOp['op']

/** What a caller may write, against `Proposal`, which is what the parse returns.
 * They differ where `createdNodeSchema` is lenient. */
export type ProposalInput = z.input<typeof proposalSchema>
