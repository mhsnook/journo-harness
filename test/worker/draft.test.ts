import { env, evictDurableObject } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

import type { BlockRow, DraftSaved } from '../../src/shared/draft'
import { MAX_BLOCK_BYTES } from '../../src/shared/draft'
import { openAgentSocket } from './agent-socket'

const block = (id: string, ord: number, text = id): BlockRow => ({
	id,
	ord,
	json: { type: 'paragraph', content: [{ type: 'text', text }] },
})

const textOf = (row: BlockRow) =>
	(row.json.content as [{ text: string }] | undefined)?.[0].text ?? ''

async function open(name: string) {
	const socket = await openAgentSocket(name)
	await socket.next('cf_agent_state')

	return {
		list: () => socket.call<BlockRow[]>('listBlocks'),
		save: (blocks: BlockRow[], removed: string[] = []) =>
			socket.call<DraftSaved>('saveBlocks', { blocks, removed }),
		socket,
	}
}

describe('the Draft', () => {
	it('is empty for an Article nobody has written in', async () => {
		const draft = await open('draft-empty')

		// Empty rather than a failure: the Panel tells "still loading" from
		// "nothing here" by this answering with a list.
		await expect(draft.list()).resolves.toEqual([])
	})

	it('reads back in ord order rather than the order it was written', async () => {
		const draft = await open('draft-order')
		await draft.save([block('c', 3), block('a', 1), block('b', 2)])

		const rows = await draft.list()
		expect(rows.map((row) => row.id)).toEqual(['a', 'b', 'c'])
	})

	it('keeps the content the editor gave it, marks and all', async () => {
		const draft = await open('draft-content')
		const heading: BlockRow = {
			id: 'h',
			ord: 1,
			json: {
				type: 'heading',
				attrs: { level: 2 },
				content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'What it costs' }],
			},
		}

		await draft.save([heading])
		expect((await draft.list())[0].json).toEqual(heading.json)
	})

	it('writes only the Blocks a save carries and leaves the rest alone', async () => {
		const draft = await open('draft-delta')
		await draft.save([block('a', 1, 'One.'), block('b', 2, 'Two.')])

		const receipt = await draft.save([block('b', 2, 'Two, rewritten.')])
		expect(receipt.written).toBe(1)

		const rows = await draft.list()
		expect(rows.map(textOf)).toEqual(['One.', 'Two, rewritten.'])
	})

	it('removes a Block by id', async () => {
		const draft = await open('draft-remove')
		await draft.save([block('a', 1), block('b', 2)])
		await draft.save([], ['a'])

		expect((await draft.list()).map((row) => row.id)).toEqual(['b'])
	})

	it('takes a removal of a Block that has already gone', async () => {
		const draft = await open('draft-remove-twice')
		await draft.save([block('a', 1)])
		await draft.save([], ['a'])

		// The retry path: a save failed, the writer kept typing, and the same
		// removal rides the next one. It has to land rather than throw.
		await expect(draft.save([], ['a'])).resolves.toMatchObject({ removed: 1 })
	})

	it('puts a Block back when one save removes and re-adds the same id', async () => {
		const draft = await open('draft-resurrect')
		await draft.save([block('a', 1, 'First.')])
		await draft.save([block('a', 1, 'Second.')], ['a'])

		expect((await draft.list()).map(textOf)).toEqual(['Second.'])
	})

	it('refuses a change that does not parse, and writes nothing', async () => {
		const draft = await open('draft-refuse')
		await draft.save([block('a', 1)])

		await expect(
			draft.socket.call('saveBlocks', { blocks: [{ id: 'b' }], removed: [] }),
		).rejects.toThrow(/ord/)

		expect((await draft.list()).map((row) => row.id)).toEqual(['a'])
	})

	it('refuses an oversized Block, and names it', async () => {
		const draft = await open('draft-too-big')
		const huge: BlockRow = {
			id: 'fat',
			ord: 1,
			json: { type: 'paragraph', text: 'x'.repeat(MAX_BLOCK_BYTES) },
		}

		await expect(draft.save([huge])).rejects.toThrow(/Block fat is \d+ bytes/)
		await expect(draft.list()).resolves.toEqual([])
	})

	it('keeps the Blocks across a hibernation', async () => {
		const draft = await open('draft-hibernate')
		await draft.save([block('a', 1, 'Survives.')])

		await evictDurableObject(
			env.ArticleAgent.get(env.ArticleAgent.idFromName('draft-hibernate')),
		)

		// `onStart` runs again on the wake, so its DDL has to be idempotent.
		const woken = await open('draft-hibernate')
		expect((await woken.list()).map(textOf)).toEqual(['Survives.'])
	})

	it('does not disturb the Plan', async () => {
		const draft = await open('draft-quiet')
		await draft.save([block('a', 1)])

		// The two stores are separate on purpose — §3. A row write that
		// broadcast state would mean the Plan had a second writer.
		expect(await draft.socket.quiet('cf_agent_state')).toEqual([])
	})
})
