import { MockLanguageModelV3, simulateReadableStream } from 'ai/test'
import { env, runInDurableObject } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

import type { ProposalInput } from '../../src/shared/plan'
import { makeNode, makePlan } from '../shared/plan-fixtures'
import { type Frame, openAgentSocket } from './agent-socket'

/**
 * The server side of a Chat turn — docs/architecture.md §6 and §7.
 *
 * No test calls a model: Workers AI is a remote-only binding and
 * `vitest.config.ts` keeps remote bindings off, so a fresh clone can run
 * `pnpm test` without an API token. What these tests drive instead is the
 * Article Agent's `chatModel()` method, replaced with a scripted one. The
 * boundary under test is what the turn does with a model's answer, and that is
 * the same boundary either way.
 */

/** One part of a scripted model's stream. Read off `MockLanguageModelV3`
 * rather than imported: the union lives in `@ai-sdk/provider`, which this repo
 * has only as a transitive package. Stating it is what keeps a chunk list from
 * widening to `string` and typechecking against nothing. */
type StreamResult = Awaited<ReturnType<MockLanguageModelV3['doStream']>>
type StreamPart = StreamResult['stream'] extends ReadableStream<infer Part> ? Part : never
type GenerateResult = Awaited<ReturnType<MockLanguageModelV3['doGenerate']>>

/** How a turn ended. A provider also reports its own raw reason, and nothing
 * here reads that. */
const stopped = { unified: 'stop' as const, raw: undefined }
const calledATool = { unified: 'tool-calls' as const, raw: undefined }

/** Token counts a real provider fills in. Nothing here reads them. */
const noUsage = {
	inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
	outputTokens: { total: 0, text: 0, reasoning: 0 },
}

/** One scripted turn read back as a whole answer rather than as a stream, for
 * the calls that do not stream. `repairToolCall` is the one that matters: it
 * retries a refused call with `generateText`, because nothing consumes a
 * retry's stream. */
function whole(turn: StreamPart[]): GenerateResult {
	const finish = turn.find((part) => part.type === 'finish')
	const content: GenerateResult['content'] = []

	for (const part of turn) {
		if (part.type === 'tool-call') content.push(part)
		if (part.type === 'text-delta') content.push({ type: 'text', text: part.delta })
	}

	return {
		content,
		finishReason: finish?.type === 'finish' ? finish.finishReason : stopped,
		usage: noUsage,
		warnings: [],
	}
}

/** A model that plays these turns back, one per call, streamed or whole. Both
 * entry points share the counter, so a turn that streams and then retries
 * takes the first two turns in order.
 *
 * The counter is ours rather than `MockLanguageModelV3`'s own array handling,
 * which reads `doStream[this.doStreamCalls.length]` after pushing the call and
 * so answers the first call with the second element. */
function scripted(turns: StreamPart[][]) {
	let call = 0

	return new MockLanguageModelV3({
		doStream: async () => ({
			stream: simulateReadableStream({ chunks: turns[call++] ?? [] }),
		}),
		doGenerate: async () => whole(turns[call++] ?? []),
	})
}

/** A model that answers in prose, the way a turn that discusses the Plan does. */
function speaks(text: string) {
	const turn: StreamPart[] = [
		{ type: 'stream-start', warnings: [] },
		{ type: 'text-start', id: 't1' },
		{ type: 'text-delta', id: 't1', delta: text },
		{ type: 'text-end', id: 't1' },
		{ type: 'finish', finishReason: stopped, usage: noUsage },
	]

	return scripted([turn])
}

/** One turn calling the Proposal tool. The tool has no `execute`, so the call
 * suspends rather than running, and that suspension is the Proposal. */
function proposalTurn(input: string): StreamPart[] {
	return [
		{ type: 'stream-start', warnings: [] },
		{ type: 'tool-input-start', id: 'call-1', toolName: 'proposePlanChange' },
		{ type: 'tool-input-delta', id: 'call-1', delta: input },
		{ type: 'tool-input-end', id: 'call-1' },
		{
			type: 'tool-call',
			toolCallId: 'call-1',
			toolName: 'proposePlanChange',
			input,
		},
		{ type: 'finish', finishReason: calledATool, usage: noUsage },
	]
}

/** A model that proposes, taking each input in turn, so a test can script a
 * refused call and the retry that follows it. */
function proposes(...inputs: string[]) {
	return scripted(inputs.map(proposalTurn))
}

/** Put a scripted model behind the Article Agent's model boundary. The model
 * records the calls made against it, so the caller keeps its own reference and
 * reads the prompt pack off `doStreamCalls`. */
async function scriptModel(name: string, model: MockLanguageModelV3): Promise<void> {
	const stub = env.ArticleAgent.get(env.ArticleAgent.idFromName(name))
	await runInDurableObject(stub, (agent) => {
		agent.chatModel = () => model
	})
}

const plan = makePlan({
	title: 'The permit queue',
	totalTarget: 1200,
	outline: [
		makeNode({ id: 'n1', title: 'The opening', intent: 'Open on one refused permit.' }),
	],
})

const proposal: ProposalInput = [
	{ op: 'setTarget', nodeId: 'n1', expected: null, value: 400 },
]

/** The chunk types a turn streamed, which is what tells a Proposal turn from a
 * prose one without reaching into the transcript. */
const types = (chunks: Frame[]) => chunks.map((chunk) => chunk.type)

describe('a Chat turn', () => {
	it('returns a Proposal as a suspended tool call', async () => {
		const writer = await openAgentSocket('chat-proposal')
		await scriptModel('chat-proposal', proposes(JSON.stringify({ ops: proposal })))

		const chunks = await writer.chat('Give the opening a word count.', { plan })

		expect(types(chunks)).toContain('tool-input-available')
		expect(types(chunks)).not.toContain('tool-output-available')

		const call = chunks.find((chunk) => chunk.type === 'tool-input-available')
		expect(call).toMatchObject({
			toolName: 'proposePlanChange',
			input: { ops: proposal },
		})
	})

	it('returns prose with no tool call', async () => {
		const writer = await openAgentSocket('chat-prose')
		await scriptModel('chat-prose', speaks('Four hundred words fits that opening.'))

		const chunks = await writer.chat('Is four hundred words right for the opening?', {
			plan,
		})

		expect(types(chunks)).toContain('text-delta')
		expect(types(chunks)).not.toContain('tool-input-available')
		expect(chunks.find((chunk) => chunk.type === 'text-delta')).toMatchObject({
			delta: 'Four hundred words fits that opening.',
		})
	})

	// The transcript is append-only and the Plan is not, so the Plan follows the
	// conversation — §7. It goes in front of the last message rather than after
	// it, so the writer's own words stay the last thing the model reads.
	it('packs the guide rules, then the conversation, then the Plan', async () => {
		const writer = await openAgentSocket('chat-pack')
		const model = speaks('Noted.')
		await scriptModel('chat-pack', model)

		await writer.chat('What is the opening for?', { plan })

		const [call] = model.doStreamCalls
		const system = call.prompt.find((message) => message.role === 'system')

		expect(String(system?.content)).toContain('Your own taste is')
		// The Plan is not in the prefix, which is the whole point of the ordering.
		expect(String(system?.content)).not.toContain('The permit queue')

		const [, ...conversation] = call.prompt
		expect(conversation).toHaveLength(2)

		const planBlock = JSON.stringify(conversation[0])
		expect(planBlock).toContain('The permit queue')
		expect(planBlock).toContain('Open on one refused permit.')

		expect(JSON.stringify(conversation.at(-1))).toContain('What is the opening for?')
	})

	it('offers both tools to the model', async () => {
		const writer = await openAgentSocket('chat-tools')
		const model = speaks('Noted.')
		await scriptModel('chat-tools', model)

		await writer.chat('Anything to say about the outline?', { plan })

		const [call] = model.doStreamCalls
		expect(call.tools?.map((tool) => tool.name)).toEqual([
			'proposePlanChange',
			'recordOffers',
		])
	})

	it('falls back to the Plan in state when the turn carries no body', async () => {
		const writer = await openAgentSocket('chat-no-body')
		// A second connection reads the broadcast, because the Agent does not
		// echo a Plan back to the connection that wrote it. Waiting on it is
		// what makes the write land before the turn reads state.
		const reader = await openAgentSocket('chat-no-body')
		await reader.next('cf_agent_state')
		writer.setState(plan)
		await reader.next('cf_agent_state')
		const model = speaks('Noted.')
		await scriptModel('chat-no-body', model)

		await writer.chat('What is the opening for?')

		const [call] = model.doStreamCalls

		// Second to last, because the writer's own message stays last.
		expect(JSON.stringify(call.prompt.at(-2))).toContain('The permit queue')
	})

	// The op payloads are strict, so a model that adds a field fails the whole
	// call rather than having the field stripped — docs/architecture.md §6.
	it('retries a refused tool call, carrying the validation error back', async () => {
		const writer = await openAgentSocket('chat-retry')
		const withExtraField = JSON.stringify({
			ops: [
				{ op: 'setTarget', nodeId: 'n1', expected: null, value: 400, why: 'it is short' },
			],
		})
		const model = proposes(withExtraField, JSON.stringify({ ops: proposal }))
		await scriptModel('chat-retry', model)

		const chunks = await writer.chat('Give the opening a word count.', { plan })

		// The retry is a `generateText` call, so it lands on doGenerate rather
		// than beside the streamed turn.
		const [retry] = model.doGenerateCalls
		const reask = JSON.stringify(retry.prompt.at(-1))
		expect(reask).toContain('was refused')
		expect(reask).toContain('why')
		expect(chunks.find((chunk) => chunk.type === 'tool-input-available')).toMatchObject({
			input: { ops: proposal },
		})
	})

	// The failure mode §6 names as the cost of strict payloads: a model that
	// adds the same field every time thrashes the retry instead of converging.
	// One retry is the whole budget, so the second refusal ends the turn.
	it('gives up when the retry is refused too, and says so', async () => {
		const writer = await openAgentSocket('chat-retry-exhausted')
		const withExtraField = JSON.stringify({
			ops: [
				{ op: 'setTarget', nodeId: 'n1', expected: null, value: 400, why: 'it is short' },
			],
		})
		const model = proposes(withExtraField, withExtraField)
		await scriptModel('chat-retry-exhausted', model)

		const chunks = await writer.chat('Give the opening a word count.', { plan })

		// It asked twice and got nowhere, so no Proposal reaches the writer.
		expect(model.doGenerateCalls).toHaveLength(1)
		expect(types(chunks)).not.toContain('tool-input-available')
		expect(types(chunks)).toContain('tool-input-error')

		// And the error names the field the model kept adding, rather than the
		// SDK's default "An error occurred."
		const failed = chunks.find((chunk) => chunk.type === 'tool-input-error')
		expect(String(failed?.errorText)).toContain('why')
	})

	it('keeps the transcript in the Agents SDK store, and the Plan out of it', async () => {
		const writer = await openAgentSocket('chat-transcript')
		await scriptModel('chat-transcript', speaks('Noted.'))

		await writer.chat('What is the opening for?', { plan })

		const response = await env.ArticleAgent.get(
			env.ArticleAgent.idFromName('chat-transcript'),
		).fetch('https://harness.test/agents/article-agent/chat-transcript/get-messages')
		const messages = (await response.json()) as { role: string; parts: unknown[] }[]

		expect(messages.map((message) => message.role)).toEqual(['user', 'assistant'])
		expect(JSON.stringify(messages)).not.toContain('The permit queue')
	})
})
