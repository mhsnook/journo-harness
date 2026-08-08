import {
	type DynamicToolUIPart,
	getToolName,
	isToolUIPart,
	type ToolUIPart,
	type UIMessage,
} from 'ai'
import { z } from 'zod'

import { proposePlanChangeInput } from '../../shared/chat'
import type { Anchor, Plan, Proposal, ProposalOp, Refusal } from '../../shared/plan'
import { planNames } from '../plan/names'
import { referenceName } from '../plan/references'

/**
 * Reading Proposals out of a Chat transcript, and writing what a card says.
 *
 * A Proposal is a suspended tool call: `proposePlanChange` carries no `execute`,
 * so the turn stops with the call's input available and no output, waiting for
 * the writer — docs/architecture.md §6. Nothing here touches the socket or
 * React, so a test drives it with a transcript and a Plan.
 */

/** One Proposal the writer has not ruled on yet. */
export type ProposalCall = {
	toolCallId: string
	/** The ops, and null when the model's payload did not parse. */
	ops: Proposal | null
	/** Why the payload could not be read, and null when it was. */
	unreadable: string | null
}

/** A tool call the Chat is still waiting on an answer for. */
export type WaitingCall = { toolCallId: string; toolName: string }

type AnyToolPart = ToolUIPart | DynamicToolUIPart

/**
 * Every tool call whose input is complete and whose output has not been sent.
 *
 * This is what parks a turn. Cloudflare's `ai-chat` enforces batch completeness
 * server-side with **no orphan timeout** (§11), so a call the writer neither
 * Accepts nor Declines stalls the conversation with nothing on screen to say
 * so. The composer reads this and says it.
 */
export function waitingCalls(messages: readonly UIMessage[]): WaitingCall[] {
	return suspended(messages).map((part) => ({
		toolCallId: part.toolCallId,
		toolName: getToolName(part),
	}))
}

function suspended(messages: readonly UIMessage[]): AnyToolPart[] {
	const calls: AnyToolPart[] = []

	for (const message of messages) {
		for (const part of message.parts) {
			if (isToolUIPart(part) && part.state === 'input-available') calls.push(part)
		}
	}

	return calls
}

/**
 * The tool's input schema is strict and a rejected call retries with the
 * validation error (§6), so an unreadable payload here is a payload that
 * survived every retry. The card says so rather than rendering blank.
 */
export function readProposal(part: AnyToolPart): ProposalCall {
	const parsed = proposePlanChangeInput.safeParse(part.input)
	if (!parsed.success) {
		return {
			toolCallId: part.toolCallId,
			ops: null,
			unreadable: z.prettifyError(parsed.error),
		}
	}

	return { toolCallId: part.toolCallId, ops: parsed.data.ops, unreadable: null }
}

/** What goes back on a Decline, as `is_error: true` with the reason in the
 * content — §6. A Proposal the Plan refused sends the refusal, so the model
 * knows the Plan moved rather than that the writer said no. */
export function declineReason(call: ProposalCall, refusal: Refusal | null): string {
	if (call.unreadable !== null) {
		return `This Proposal did not parse, so there was nothing to Accept. ${call.unreadable}`
	}
	if (refusal !== null) {
		return `The Plan refused this Proposal. ${refusal.message}`
	}

	return 'The writer Declined this Proposal.'
}

/** What goes back on an Accept. The next turn carries the whole Plan in `body`,
 * so this says the ruling and nothing about the result. */
export function acceptReason(ops: Proposal): string {
	const count = ops.length === 1 ? 'change' : `${ops.length} changes`

	return `The writer Accepted this Proposal, and the Plan now carries the ${count}.`
}

/** What the tool call is answered with. An `errorText` is the `is_error: true`
 * half — §6. */
export type ToolAnswer = { output: string } | { errorText: string }

/** Why an Accept did not land, by tool call. A Panel holds one of these because
 * a transcript can carry more than one open Proposal. */
export type Refusals = Record<string, Refusal>

/** Fold a ruling into what the Panel holds: an Accept that landed clears the
 * refusal the card was showing, and a Decline clears it on the way out. */
export function afterRuling(
	held: Refusals,
	toolCallId: string,
	refusal: Refusal | null,
): Refusals {
	const rest = { ...held }
	delete rest[toolCallId]

	return refusal === null ? rest : { ...rest, [toolCallId]: refusal }
}

export type Ruling = {
	/** What to send back, and null where the Proposal stays open. */
	answer: ToolAnswer | null
	/** Why the Accept did not land, and null where it did. */
	refusal: Refusal | null
}

export type RulingOptions = {
	call: ProposalCall
	/** True Accepts, false Declines. */
	accepted: boolean
	/** The Plan's one writer — the same `edit` every other Plan change makes. */
	edit: (ops: Proposal) => Refusal | null
	/** Why an earlier Accept on this call did not land. */
	refusal: Refusal | null
}

/**
 * One ruling: apply the ops if it is an Accept, then say what goes back on the
 * tool call. The app and a story both run this, so a story cannot rule
 * differently from the product.
 *
 * **A refused Accept answers nothing and leaves the card open.** Whole-field
 * `expected` comparison is conservative and refuses against a field the writer
 * has since touched, so the writer may fix the Plan and Accept again. Declining
 * then sends the refusal back, which tells the model the Plan moved rather than
 * that the writer said no.
 */
export function ruleProposal({ call, accepted, edit, refusal }: RulingOptions): Ruling {
	if (!accepted || call.ops === null) {
		return { answer: { errorText: declineReason(call, refusal) }, refusal: null }
	}

	const refused = edit(call.ops)
	if (refused !== null) return { answer: null, refusal: refused }

	return { answer: { output: acceptReason(call.ops) }, refusal: null }
}

/**
 * The Proposal in the writer's words, one sentence per op, read against the
 * Plan on screen. A Section is named the way every other Panel names it, so the
 * card and the Outline cannot number one differently.
 */
export function describeProposal(plan: Plan, ops: Proposal): string[] {
	const { section, reference, scope } = planNames(plan)

	// A structural op states exactly one of the two, so the branch not taken is
	// the one the op left out — `afterId: null` is first child and
	// `beforeId: null` is last.
	const anchored = (parentId: string | null, op: Anchor) => {
		if (op.beforeId !== undefined) {
			return op.beforeId === null ? lastIn(parentId) : `before ${section(op.beforeId)}`
		}
		if (op.afterId !== undefined && op.afterId !== null) {
			return `after ${section(op.afterId)}`
		}

		return firstIn(parentId)
	}
	const lastIn = (parentId: string | null) =>
		parentId === null ? 'last in the Outline' : `last inside ${section(parentId)}`
	const firstIn = (parentId: string | null) =>
		parentId === null ? 'first in the Outline' : `first inside ${section(parentId)}`

	return ops.map((op) => describe(op))

	function describe(op: ProposalOp): string {
		switch (op.op) {
			case 'createNode':
				return `Add ${titled(op.node.title)}, ${anchored(op.parentId, op)}.`
			case 'moveNode':
				return `Move ${section(op.nodeId)} ${anchored(op.parentId, op)}.`
			case 'mergeNodes':
				return `Merge ${section(op.nodeId)} into ${section(op.intoId)}, keeping what the second one says.`
			case 'deleteNode':
				return `Delete ${section(op.nodeId)}, and unplace the References sitting there.`
			case 'setTitle':
				return op.value === ''
					? `Clear the title of ${scope(op.nodeId)}.`
					: `Retitle ${scope(op.nodeId)} “${op.value}”.`
			case 'setIntent':
				return op.value === null
					? `Clear the intent note on ${section(op.nodeId)}.`
					: `Note on ${section(op.nodeId)}: “${op.value}”.`
			case 'setTarget':
				return op.value === null
					? `Clear the length of ${scope(op.nodeId)}.`
					: `Set the length of ${scope(op.nodeId)} to ${op.value} words.`
			case 'setVoice':
				return op.value === null
					? `Clear the Voice of ${scope(op.nodeId)}.`
					: `Set the Voice of ${scope(op.nodeId)} to ${op.value}.`
			case 'setAdjectives':
				return op.value.length === 0
					? `Clear the Adjectives of ${scope(op.nodeId)}.`
					: `Set the Adjectives of ${scope(op.nodeId)} to ${op.value.join(', ')}.`
			case 'placeReference':
				return op.value === null
					? `Take ${reference(op.referenceId)} off the Section it sits at.`
					: `Place ${reference(op.referenceId)} at ${section(op.value)}.`
			case 'createReference':
				return `Add ${referenceName(op.reference)} to the References.`
			case 'deleteReference':
				return `Delete ${reference(op.referenceId)} from the References.`
			case 'setReference':
				return `Replace what ${reference(op.referenceId)} says.`
		}
	}
}

function titled(title: string): string {
	return title === '' ? 'an untitled Section' : `a Section, “${title}”`
}
