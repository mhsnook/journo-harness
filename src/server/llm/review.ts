import { generateObject, type LanguageModel, type ModelMessage } from 'ai'

import {
	type ReviewDepth,
	type ReviewOutput,
	reviewOutputSchema,
} from '../../shared/review'
import { reviewPackMessages, type ReviewPack, reviewSystemPrompt } from './review-pack'

/**
 * One Review, composed away from the Durable Object that hosts it.
 *
 * Everything here is a pure function of what it is handed, so a test drives it
 * with a scripted model and no Article Agent — the same shape as
 * `llm/chat-turn.ts`. The Article Agent supplies the model, the Plan, the
 * Draft, and the open Notes, because it is the only thing that holds them.
 *
 * Structured output rather than prose the app parses, with **one retry that
 * carries the validation error** — `docs/architecture.md` §7 and issue #16. If
 * glm-5.2's structured output disappoints, #16's answer is to swap the model
 * string in `llm/model.ts` to `@cf/moonshotai/kimi-k2.6` rather than to loosen
 * the schema.
 */

export type ReviewTurn = {
	model: LanguageModel
	depth: ReviewDepth
	pack: ReviewPack
	abortSignal?: AbortSignal
}

export async function reviewTurn({
	model,
	depth,
	pack,
	abortSignal,
}: ReviewTurn): Promise<ReviewOutput> {
	const system = reviewSystemPrompt(depth)
	const messages = reviewPackMessages(pack)

	const ask = (asked: ModelMessage[]) =>
		generateObject({
			model,
			system,
			messages: asked,
			schema: reviewOutputSchema,
			abortSignal,
		})

	try {
		const { object } = await ask(messages)

		return object
	} catch (error) {
		// One retry, and only one: a model that gets the shape wrong the same way
		// twice will get it wrong a third time, and the writer is waiting. The
		// second failure is what the Round records as its reason.
		if (abortSignal?.aborted === true) throw error

		const { object } = await ask([...messages, correction(error)])

		return object
	}
}

/** What the model is told about its own refused answer. `generateObject` throws
 * on both a schema mismatch and unparseable JSON, and the message names which. */
function correction(error: unknown): ModelMessage {
	const reason = error instanceof Error ? error.message : String(error)

	return {
		role: 'user',
		content: [
			`That response was refused: ${reason}`,
			'Answer again in the shape asked for, correcting only what the error names.',
		].join('\n'),
	}
}
