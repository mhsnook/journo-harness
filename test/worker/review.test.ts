import { MockLanguageModelV3 } from 'ai/test'
import { env, runInDurableObject } from 'cloudflare:test'
import { describe, expect, it, vi } from 'vitest'

import type { ArticleAgent } from '../../src/server/article-agent'
import type { NoteAnchor } from '../../src/shared/note'
import type { ReviewOutput, Round } from '../../src/shared/review'
import { makeNode, makePlan } from '../shared/plan-fixtures'
import { openAgentSocket } from './agent-socket'

/**
 * The Review, end to end inside the Article Agent — `docs/architecture.md` §3
 * and §7.
 *
 * No test calls a model, for the reason `chat-turn.test.ts` gives: Workers AI
 * is a remote-only binding and `vitest.config.ts` keeps remote bindings off.
 * What these drive is `reviewModel()`, replaced with a scripted one, so the
 * boundary under test is what the Article Agent does with a model's answer.
 */

/** Token counts a real provider fills in. Nothing here reads them. */
const noUsage = {
	inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
	outputTokens: { total: 0, text: 0, reasoning: 0 },
}

/** A model that answers `generateObject` with this JSON, once per call. A
 * second element is what a refused first answer retries into. */
function answers(...bodies: string[]) {
	let call = 0

	return new MockLanguageModelV3({
		doGenerate: async () => ({
			content: [{ type: 'text' as const, text: bodies[call++] ?? '' }],
			finishReason: { unified: 'stop' as const, raw: undefined },
			usage: noUsage,
			warnings: [],
		}),
	})
}

/** A model that fails the way a provider outage does. */
function fails(why: string) {
	return new MockLanguageModelV3({
		doGenerate: async () => {
			throw new Error(why)
		},
	})
}

function stub(name: string) {
	return env.ArticleAgent.get(env.ArticleAgent.idFromName(name))
}

function inAgent<T>(
	name: string,
	run: (agent: ArticleAgent) => T | Promise<T>,
): Promise<T> {
	return runInDurableObject(stub(name), run)
}

/** Put a scripted model behind the Article Agent's Review boundary. */
function scriptModel(name: string, model: MockLanguageModelV3): Promise<void> {
	return inAgent(name, (agent) => {
		agent.reviewModel = () => model
	})
}

/** The Round, once it has stopped running. `startReview` answers as soon as the
 * row exists and the model call carries on under `waitUntil`, so every test
 * waits on the row rather than on the call. */
function settled(name: string): Promise<Round> {
	return vi.waitFor(async () => {
		const rounds = await inAgent(name, (agent) => agent.listRounds())
		const round = rounds[rounds.length - 1]

		expect(round?.state).not.toBe('running')

		return round
	})
}

const plan = makePlan({
	title: 'The permit queue',
	outline: [makeNode({ id: 'n1', title: 'The opening' })],
})

const blocks = [
	{
		id: 'b1',
		ord: 1,
		json: { type: 'paragraph', content: [{ type: 'text', text: 'One.' }] },
	},
	{
		id: 'b2',
		ord: 2,
		json: { type: 'paragraph', content: [{ type: 'text', text: 'Two.' }] },
	},
]

/** One response: prose, then the Notes it produced. */
function response(anchor: NoteAnchor): string {
	const output: ReviewOutput = {
		parts: [
			{
				prose: 'Two supporting points do most of the work in this section.',
				label: 'on the first point',
				notes: [
					{
						type: 'repetition',
						anchor,
						label: 're-argued',
						body: 'Cut to a clause.',
					},
				],
			},
			{ prose: 'The thesis itself appears twice, and that is within reason.', notes: [] },
		],
	}

	return JSON.stringify(output)
}

const ask = {
	prompt: 'Review for repetition of the supporting logic.',
	depth: 'quick' as const,
}

describe('running a Review', () => {
	it('answers with a running Round before the model has said anything', async () => {
		await openAgentSocket('review-starts')
		await scriptModel('review-starts', answers(response({ kind: 'article' })))

		const round = await inAgent('review-starts', (agent) => agent.startReview(ask))

		expect(round.state).toBe('running')
		expect(round.ordinal).toBe(1)
		expect(round.prompt).toBe(ask.prompt)
	})

	it('writes the response and its Notes as rows', async () => {
		await openAgentSocket('review-writes')
		await scriptModel(
			'review-writes',
			answers(response({ kind: 'blocks', blockIds: ['b2'] })),
		)
		await inAgent('review-writes', (agent) => {
			agent.saveBlocks({ blocks, removed: [] })
			agent.startReview({ ...ask, plan })
		})

		const round = await settled('review-writes')
		const notes = await inAgent('review-writes', (agent) => agent.listNotes())

		expect(round.state).toBe('done')
		expect(round.parts).toHaveLength(2)
		expect(round.failure).toBeNull()

		// The part names its Notes by id, so the response and the queue are two
		// readings of one set of rows.
		expect(round.parts[0].noteIds).toEqual([notes[0].id])
		expect(round.parts[1].noteIds).toEqual([])

		expect(notes).toHaveLength(1)
		expect(notes[0]).toMatchObject({
			roundId: round.id,
			type: 'repetition',
			label: 're-argued',
			disposition: 'proposed',
			anchor: { kind: 'blocks', blockIds: ['b2'] },
		})
	})

	it('settles an anchor naming a paragraph the Draft does not carry', async () => {
		await openAgentSocket('review-anchor')
		await scriptModel(
			'review-anchor',
			answers(response({ kind: 'blocks', blockIds: ['never-existed'] })),
		)
		await inAgent('review-anchor', (agent) => {
			agent.saveBlocks({ blocks, removed: [] })
			agent.startReview(ask)
		})

		await settled('review-anchor')
		const notes = await inAgent('review-anchor', (agent) => agent.listNotes())

		// Taken rather than refused: an anchor the client cannot resolve reads as
		// the whole piece, and nothing breaks — issue #42's line.
		expect(notes[0].anchor).toEqual({ kind: 'article' })
	})

	it('settles an anchor against the Plan the Review was shown, not the stored one', async () => {
		await openAgentSocket('review-newer-plan')
		await scriptModel(
			'review-newer-plan',
			answers(response({ kind: 'section', nodeId: 'n1' })),
		)

		// The client holds a Section its `setState` has not landed yet, and sends
		// it with the Review — §3, rule 1. Checking the anchor against state would
		// call that Section gone and drop the Note to the whole piece.
		await inAgent('review-newer-plan', (agent) => agent.startReview({ ...ask, plan }))

		await settled('review-newer-plan')
		const notes = await inAgent('review-newer-plan', (agent) => agent.listNotes())

		expect(notes[0].anchor).toEqual({ kind: 'section', nodeId: 'n1' })
	})

	it('records a failure on the Round, where the writer will find it', async () => {
		await openAgentSocket('review-fails')
		await scriptModel('review-fails', fails('The model is having a day.'))
		await inAgent('review-fails', (agent) => agent.startReview(ask))

		const round = await settled('review-fails')

		expect(round.state).toBe('failed')
		expect(round.failure).toContain('The model is having a day.')
		expect(round.parts).toEqual([])
	})

	it('runs one Review at a time on an Article', async () => {
		await openAgentSocket('review-one')
		await scriptModel('review-one', answers(response({ kind: 'article' })))

		await expect(
			inAgent('review-one', (agent) => {
				agent.startReview(ask)
				agent.startReview(ask)
			}),
		).rejects.toThrow(/still running/)
	})

	it('says which Round settled, because nothing else would', async () => {
		const reader = await openAgentSocket('review-frame')
		await scriptModel('review-frame', answers(response({ kind: 'article' })))

		const round = await inAgent('review-frame', (agent) => agent.startReview(ask))

		await expect(reader.next('review_finished')).resolves.toMatchObject({
			roundId: round.id,
		})
	})
})

describe('ruling on a Note', () => {
	/** One Article with one proposed Note on it. */
	async function withNote(name: string) {
		await openAgentSocket(name)
		await scriptModel(name, answers(response({ kind: 'article' })))
		await inAgent(name, (agent) => agent.startReview(ask))
		await settled(name)

		const notes = await inAgent(name, (agent) => agent.listNotes())

		return notes[0].id
	}

	it('accepts, resolves, and undoes each move', async () => {
		const id = await withNote('note-accept')

		await expect(
			inAgent('note-accept', (agent) => agent.setNoteDisposition(id, 'accepted')),
		).resolves.toMatchObject({ disposition: 'accepted' })

		await expect(
			inAgent('note-accept', (agent) => agent.resolveNote(id)),
		).resolves.toMatchObject({ disposition: 'resolved' })

		await expect(
			inAgent('note-accept', (agent) => agent.restoreNote(id)),
		).resolves.toMatchObject({ disposition: 'accepted' })
	})

	it('undoes a Decline back to proposed, and clears when it was decided', async () => {
		const id = await withNote('note-decline')

		await inAgent('note-decline', (agent) => agent.setNoteDisposition(id, 'declined'))
		const restored = await inAgent('note-decline', (agent) => agent.restoreNote(id))

		expect(restored).toMatchObject({ disposition: 'proposed', decidedAt: null })
	})

	it('refuses to rule on a Note that has already been ruled on', async () => {
		const id = await withNote('note-twice')

		await inAgent('note-twice', (agent) => agent.setNoteDisposition(id, 'accepted'))

		await expect(
			inAgent('note-twice', (agent) => agent.setNoteDisposition(id, 'declined')),
		).rejects.toThrow(/only a proposed Note is ruled/)
	})

	it('refuses to resolve a Note the writer has not accepted', async () => {
		const id = await withNote('note-resolve')

		await expect(
			inAgent('note-resolve', (agent) => agent.resolveNote(id)),
		).rejects.toThrow(/resolving finishes an accepted Note/)
	})

	it('tells a Note that does not exist from one that cannot move', async () => {
		await withNote('note-missing')

		await expect(
			inAgent('note-missing', (agent) => agent.setNoteDisposition('nope', 'accepted')),
		).rejects.toThrow(/No Note carries the id nope/)
	})
})
