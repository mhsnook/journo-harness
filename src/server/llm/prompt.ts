import type { ModelMessage } from 'ai'

import type { Plan } from '../../shared/plan'

/**
 * The Chat turn's prompt pack — `docs/architecture.md` §7. The pack is the
 * conversation plus the Plan, in that order: **the transcript is append-only
 * and the Plan is not**, so the conversation is the stable part and the Plan
 * is the volatile one.
 *
 * That reverses the ordering §7 first stated, which put the Plan in the system
 * prefix ahead of the conversation. Under that arrangement every Accepted
 * Proposal changed a prefix the whole transcript sat behind, so the product's
 * main loop invalidated its own cache on each pass. It is also simply the
 * clearer structure: the beginning of the Chat stays the beginning of the
 * context, and the artifact under construction sits where the model reads it
 * last.
 */

/** The product's own instructions to the guide, identical on every turn of
 * every Article, so they sit at the very front of the cached prefix. Not the
 * **standing rules**, which `context.md` reserves for House material the
 * writer authors and which land in the same prompt at 1b. */
const guideRules = [
	'You are the guide in a writing harness. The writer writes the prose and you help them plan it.',
	'',
	'You never write prose for the Draft, and you never write the Plan. You propose changes to the',
	'Plan with the proposePlanChange tool and the writer Accepts or Declines each one. A turn that',
	'answers a question, or asks one, carries no tool call at all.',
	'',
	'Judge the writing only against the Plan, its intent notes, and the Lexicon. Your own taste is',
	'borrowed and does not count: a Section that meets its stated intent in a register you would not',
	'have chosen is right, and saying so is the job. Where the Plan says nothing, ask rather than',
	'supplying a preference of your own.',
	'',
	'One Voice applies at a time and the nearest Scope wins outright, so switching a Voice replaces',
	'it. Adjectives compose instead, accumulating from the Article down to the Section.',
].join('\n')

/**
 * The stable prefix of one Chat turn.
 *
 * Two things join the guide rules here, and both arrive with the House at 1b:
 * the Lexicon entries in play, and the writer's own standing rules. Nothing
 * goes in either slot until then. The Plan does not belong here — see the
 * ordering note above.
 */
export function chatSystemPrompt(): string {
	return guideRules
}

/**
 * The Plan the turn is about, rendered whole.
 *
 * JSON rather than prose, because a Proposal anchors on the ids in it and an op
 * naming an id the model paraphrased is refused by the applier. Compact rather
 * than indented: indenting a Plan of a few hundred Sections buys the model
 * nothing and costs the whitespace in tokens on every turn, and twice on a turn
 * that retries.
 *
 * The `user` role rather than `system`, because a system message after the
 * first is not portable across providers.
 */
function planMessage(plan: Plan): ModelMessage {
	return {
		role: 'user',
		content: [
			'The Plan for this Article as it stands now:',
			'```json',
			JSON.stringify(plan),
			'```',
		].join('\n'),
	}
}

/**
 * The conversation with the Plan in it — after every turn but the last, so the
 * writer's own words are the last thing the model reads.
 *
 * Two orderings are defensible and neither has met a real model yet. Appending
 * the Plan after everything is one message cheaper to cache, and it makes a
 * JSON blob the final thing in the prompt, which risks a turn that answers the
 * Plan rather than the question — a model weights the last message as the one
 * to respond to, and this one opens "The Plan for this Article". Slotting it in
 * front of the last message costs one message of prefix and follows the
 * ordinary shape of retrieved context, which precedes the question that needs
 * it. That is the one taken here, and flipping it is one line. Check it on the
 * first real turn, before #26 builds a Panel around the answer.
 */
export function chatPackMessages(
	conversation: ModelMessage[],
	plan: Plan,
): ModelMessage[] {
	const last = conversation.length - 1
	if (last < 0) return [planMessage(plan)]

	return [...conversation.slice(0, last), planMessage(plan), conversation[last]]
}
