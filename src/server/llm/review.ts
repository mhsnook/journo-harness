import {
	type LanguageModel,
	type ModelMessage,
	NoObjectGeneratedError,
	streamObject,
} from 'ai'

import { reasonFor } from '../../shared/failure'
import {
	type ReviewDepth,
	type ReviewOutput,
	reviewOutputSchema,
} from '../../shared/review'
import { reviewPackMessages, type ReviewPack, reviewSystemPrompt } from './review-pack'

/**
 * One Review, composed away from the Durable Object that hosts it. Pure over
 * what it is handed, so a test drives it with a scripted model and no Article
 * Agent — the same shape as `llm/chat-turn.ts`.
 *
 * The answer is **prose inside a structure**: the model writes the passages the
 * writer reads, and the schema is what carries each one's Notes and their
 * anchors. Nothing here parses prose to find them. One retry carries the
 * validation error back — `docs/architecture.md` §7.
 *
 * The call streams, and the caller still gets the object whole. Workers AI cuts
 * off a non-streaming call that generates for longer than its request timeout —
 * a thorough Review reliably did — and streaming is what keeps the connection
 * alive for as long as the model writes. Nothing downstream changes: the Round
 * still lands as rows, and #77 (streaming the writer can watch) stays open.
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

	const ask = async (asked: ModelMessage[]): Promise<ReviewOutput> => {
		const result = streamObject({
			model,
			system,
			messages: asked,
			schema: reviewOutputSchema,
			abortSignal,
		})

		// A transport failure arrives as a part of the stream, not a throw — and
		// on one, `result.object` never settles. So the drain is the error check,
		// and the failure has to be rethrown from here.
		let failure: unknown
		let failed = false
		for await (const part of result.fullStream) {
			if (part.type === 'error') {
				failed = true
				failure = part.error
			}
		}
		if (failed) throw failure instanceof Error ? failure : new Error(String(failure))

		// Settles only now that the stream is drained. Rejects with
		// `NoObjectGeneratedError` on an answer in the wrong shape.
		return await result.object
	}

	try {
		return await ask(messages)
	} catch (error) {
		// One retry, and only for an answer in the wrong shape: a model that gets
		// the shape wrong the same way twice will get it wrong a third time, and
		// the writer is waiting. Anything else — an outage, a timeout — has had
		// `streamObject`'s own transport retries already, and a correction
		// message would tell the model it refused an answer it was not the source
		// of. The rethrow is what the Round records as its reason.
		if (abortSignal?.aborted === true) throw error
		if (!NoObjectGeneratedError.isInstance(error)) throw error

		return await ask([...messages, correction(error)])
	}
}

/** What the model is told about its own refused answer. The stream's final text
 * is refused on both a schema mismatch and unparseable JSON, and the message
 * names which. */
function correction(error: unknown): ModelMessage {
	return {
		role: 'user',
		content: [
			`That response was refused: ${reasonFor(error)}`,
			'Answer again in the shape asked for, correcting only what the error names.',
		].join('\n'),
	}
}
