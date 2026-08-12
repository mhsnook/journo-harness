import {
	convertToModelMessages,
	type GenerateTextOnFinishCallback,
	type LanguageModel,
	streamText,
	type ToolSet,
	type UIMessage,
} from 'ai'

import type { Plan } from '../../shared/plan'
import { chatPackMessages, chatSystemPrompt } from './prompt'
import { repairToolCall } from './repair'
import { chatTools } from './tools'

/**
 * One Chat turn, composed away from the Durable Object that hosts it.
 *
 * Everything here is a pure function of what it is handed, so a test drives it
 * with a scripted model and no Article Agent — which is what keeps the model
 * boundary out of the class's API. The Article Agent supplies the Plan, the
 * transcript, and the model, because it is the only thing that holds them.
 */
export type ChatTurn = {
	model: LanguageModel
	plan: Plan
	messages: UIMessage[]
	onFinish: GenerateTextOnFinishCallback<ToolSet>
	abortSignal?: AbortSignal
	/** The Accepted Learned rules, already read — §12. Passed in rather than
	 * fetched here, because this function reaches no binding and a test drives
	 * it with a scripted model and no D1. */
	rules?: readonly string[]
}

export async function chatTurn({
	model,
	plan,
	messages,
	onFinish,
	abortSignal,
	rules = [],
}: ChatTurn): Promise<Response> {
	const result = streamText({
		model,
		// Rules, then conversation and Plan, per Architecture §7
		system: chatSystemPrompt(rules),
		messages: chatPackMessages(await convertToModelMessages(messages), plan),
		tools: chatTools,
		abortSignal,
		onFinish,
		repairToolCall: repairToolCall(model),
	})

	// The UI message stream is what `onChatMessage` has to hand back, and
	// returning it here keeps the whole turn in one place.
	//
	// `onError` overrides the SDK's default, which replaces every error with
	// "An error occurred." That default guards against leaking a server's
	// internals to a browser it does not trust, and this one is the writer's own
	// app: what it would hide is the schema's reason for refusing the model's
	// tool call, which is exactly what the writer needs to see when a model
	// thrashes the retry (§6). The same argument as `plan_refused` in
	// `src/shared/plan/refusal.ts`.
	return result.toUIMessageStreamResponse({
		onError: (error) => (error instanceof Error ? error.message : String(error)),
	})
}
