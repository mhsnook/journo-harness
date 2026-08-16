import { describe, expect, it } from 'vitest'

import {
	type BlockRow,
	checkChangeSize,
	draftChangeSchema,
	MAX_BLOCK_BYTES,
} from '../../src/shared/draft'

const block = (over: Partial<BlockRow> = {}): BlockRow => ({
	id: 'b1',
	ord: 1,
	json: { type: 'paragraph', content: [{ type: 'text', text: 'One.' }] },
	...over,
})

describe('draftChangeSchema', () => {
	it('takes a change carrying one Block', () => {
		const parsed = draftChangeSchema.parse({ blocks: [block()], removed: [] })
		expect(parsed.blocks[0].id).toBe('b1')
	})

	it('takes an empty change', () => {
		// The writer guards against sending one; the schema is not the thing that
		// should refuse it.
		expect(() => draftChangeSchema.parse({ blocks: [], removed: [] })).not.toThrow()
	})

	it('keeps whatever the editor put in the content', () => {
		const parsed = draftChangeSchema.parse({
			blocks: [block({ json: { type: 'heading', attrs: { level: 2 } } })],
			removed: [],
		})

		expect(parsed.blocks[0].json).toEqual({ type: 'heading', attrs: { level: 2 } })
	})

	it('refuses content with no type', () => {
		expect(() =>
			draftChangeSchema.parse({ blocks: [block({ json: {} as never })], removed: [] }),
		).toThrow(/type/)
	})

	it('refuses an ord that is not a finite number', () => {
		// `JSON.stringify(NaN)` is `null`, so this is what a broken ord looks like
		// by the time it reaches the Article Agent.
		expect(() =>
			draftChangeSchema.parse({ blocks: [block({ ord: null as never })], removed: [] }),
		).toThrow(/ord/)
	})

	it('refuses an unknown field', () => {
		expect(() => draftChangeSchema.parse({ blocks: [], removed: [], when: 1 })).toThrow(
			/Unrecognized key/,
		)
	})
})

describe('checkChangeSize', () => {
	it('passes an ordinary change', () => {
		expect(() => checkChangeSize({ blocks: [block()], removed: [] })).not.toThrow()
	})

	it('refuses one oversized Block, and names it', () => {
		const huge = block({
			id: 'b9',
			json: { type: 'paragraph', text: 'x'.repeat(MAX_BLOCK_BYTES) },
		})

		expect(() => checkChangeSize({ blocks: [huge], removed: [] })).toThrow(
			/Block b9 is \d+ bytes/,
		)
	})
})
