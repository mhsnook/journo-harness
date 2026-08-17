import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
	createDraftWriter,
	DRAFT_MAX_WAIT_MS,
	DRAFT_WRITE_DELAY_MS,
	type DraftStatus,
} from '../../src/client/draft/writer'
import type { BlockRow, DraftChange, DraftSaved } from '../../src/shared/draft'

const block = (id: string, ord: number, text = id): BlockRow => ({
	id,
	ord,
	json: { type: 'paragraph', content: [{ type: 'text', text }] },
})

function harness(start: BlockRow[] = []) {
	const sent: DraftChange[] = []
	const statuses: DraftStatus[] = []
	/** What the editor holds now. A test moves this and calls `touch`. */
	let editorRows: BlockRow[] = [...start]
	let settle: ((receipt: DraftSaved) => void) | null = null
	let reject: ((error: unknown) => void) | null = null
	let savedAt = 1_000

	const writer = createDraftWriter({
		read: () => editorRows,
		save: (change) => {
			sent.push(change)
			return new Promise<DraftSaved>((resolve, rejectWith) => {
				settle = resolve
				reject = rejectWith
			})
		},
		onStatus: (status) => statuses.push(status),
		describeFailure: (error) => `The Draft did not save. ${String(error)}`,
	})
	writer.load(start)

	return {
		writer,
		sent,
		statuses,
		/** Replace what the editor holds, and tell the writer. */
		type(next: BlockRow[]) {
			editorRows = next
			writer.touch()
		},
		/** Answer the save in flight. */
		async ok() {
			savedAt += 1
			settle?.({ savedAt, written: 0, removed: 0 })
			await vi.advanceTimersByTimeAsync(0)
		},
		async fail(message = 'refused') {
			reject?.(new Error(message))
			await vi.advanceTimersByTimeAsync(0)
		},
	}
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('cadence', () => {
	it('saves once per pause rather than once per keystroke', async () => {
		const draft = harness([block('a', 1, '')])

		for (const text of ['W', 'Wh', 'Why']) {
			draft.type([block('a', 1, text)])
			await vi.advanceTimersByTimeAsync(50)
		}
		expect(draft.sent).toHaveLength(0)

		await vi.advanceTimersByTimeAsync(DRAFT_WRITE_DELAY_MS)
		expect(draft.sent).toHaveLength(1)
	})

	it('saves a writer who never pauses, at the ceiling', async () => {
		const draft = harness([block('a', 1, '')])

		// Keystrokes closer together than the pause, for longer than the ceiling.
		for (let i = 0; i < 40; i += 1) {
			draft.type([block('a', 1, 'x'.repeat(i + 1))])
			await vi.advanceTimersByTimeAsync(200)
		}

		expect(draft.sent.length).toBeGreaterThan(0)
	})

	it('does not restart the ceiling on a keystroke', async () => {
		const draft = harness([block('a', 1, '')])
		draft.type([block('a', 1, 'x')])

		// Typing every 200ms would push a restarting ceiling out for ever.
		for (let i = 0; i < Math.floor(DRAFT_MAX_WAIT_MS / 200) - 1; i += 1) {
			await vi.advanceTimersByTimeAsync(200)
			draft.type([block('a', 1, 'x'.repeat(i + 2))])
		}
		expect(draft.sent).toHaveLength(0)

		await vi.advanceTimersByTimeAsync(400)
		expect(draft.sent).toHaveLength(1)
	})
})

describe('the delta', () => {
	it('carries only the Blocks that changed', async () => {
		const draft = harness([block('a', 1), block('b', 2), block('c', 3)])

		draft.type([block('a', 1), block('b', 2, 'rewritten'), block('c', 3)])
		await vi.advanceTimersByTimeAsync(DRAFT_WRITE_DELAY_MS)

		expect(draft.sent[0].blocks.map((row) => row.id)).toEqual(['b'])
	})

	it('carries a removal as an id', async () => {
		const draft = harness([block('a', 1), block('b', 2)])

		draft.type([block('a', 1)])
		await vi.advanceTimersByTimeAsync(DRAFT_WRITE_DELAY_MS)

		expect(draft.sent[0].removed).toEqual(['b'])
	})

	it('never removes a Block it has not been told about', async () => {
		// The whole reason a save is a delta: a second tab's paragraph is not
		// something this one can delete, because it has never seen the id.
		const draft = harness([block('a', 1)])

		draft.type([block('a', 1, 'edited')])
		await vi.advanceTimersByTimeAsync(DRAFT_WRITE_DELAY_MS)

		expect(draft.sent[0].removed).toEqual([])
	})

	it('saves nothing when the document comes back to what was stored', async () => {
		const draft = harness([block('a', 1, 'One.')])

		draft.type([block('a', 1, 'One, edited.')])
		draft.type([block('a', 1, 'One.')])
		await vi.advanceTimersByTimeAsync(DRAFT_WRITE_DELAY_MS)

		expect(draft.sent).toHaveLength(0)
	})
})

describe('one save at a time', () => {
	it('holds a change that arrives mid-flight, and sends it after', async () => {
		const draft = harness([block('a', 1)])

		draft.type([block('a', 1, 'first')])
		await vi.advanceTimersByTimeAsync(DRAFT_WRITE_DELAY_MS)
		expect(draft.sent).toHaveLength(1)

		draft.type([block('a', 1, 'second')])
		await vi.advanceTimersByTimeAsync(DRAFT_WRITE_DELAY_MS * 2)
		expect(draft.sent).toHaveLength(1)

		await draft.ok()
		await vi.advanceTimersByTimeAsync(DRAFT_WRITE_DELAY_MS)
		expect(draft.sent).toHaveLength(2)
	})
})

describe('a save that fails', () => {
	it('says so, and does not retry on its own', async () => {
		const draft = harness([block('a', 1)])

		draft.type([block('a', 1, 'edited')])
		await vi.advanceTimersByTimeAsync(DRAFT_WRITE_DELAY_MS)
		await draft.fail()

		expect(draft.writer.status.state).toBe('failed')

		await vi.advanceTimersByTimeAsync(DRAFT_MAX_WAIT_MS * 3)
		expect(draft.sent).toHaveLength(1)
	})

	it('carries the same Blocks again on the next save', async () => {
		const draft = harness([block('a', 1), block('b', 2)])

		draft.type([block('a', 1, 'edited'), block('b', 2)])
		await vi.advanceTimersByTimeAsync(DRAFT_WRITE_DELAY_MS)
		await draft.fail()

		// `b` was never dirty, so only `a` is owed — but `a` is still owed,
		// because the baseline did not move when the save failed.
		draft.type([block('a', 1, 'edited'), block('b', 2)])
		await vi.advanceTimersByTimeAsync(DRAFT_WRITE_DELAY_MS)

		expect(draft.sent[1].blocks.map((row) => row.id)).toEqual(['a'])
	})
})

describe('status', () => {
	it('reads the saved time off the receipt rather than the clock', async () => {
		const draft = harness([block('a', 1)])

		draft.type([block('a', 1, 'edited')])
		await vi.advanceTimersByTimeAsync(DRAFT_WRITE_DELAY_MS)
		await draft.ok()

		expect(draft.writer.status).toMatchObject({ state: 'clean', savedAt: 1_001 })
	})

	it('goes pending the moment the writer types', () => {
		const draft = harness([block('a', 1)])
		draft.type([block('a', 1, 'edited')])

		expect(draft.writer.status.state).toBe('pending')
	})
})

describe('dispose', () => {
	it('sends what is waiting', async () => {
		const draft = harness([block('a', 1)])

		draft.type([block('a', 1, 'edited')])
		draft.writer.dispose()

		expect(draft.sent).toHaveLength(1)
	})

	it('leaves no timer behind', async () => {
		const draft = harness([block('a', 1)])

		draft.type([block('a', 1, 'edited')])
		draft.writer.dispose()
		await vi.advanceTimersByTimeAsync(DRAFT_MAX_WAIT_MS * 2)

		expect(draft.sent).toHaveLength(1)
	})

	it('keeps its baseline, so showing the Panel again does not resend', async () => {
		const draft = harness([block('a', 1)])

		draft.type([block('a', 1, 'edited')])
		draft.writer.dispose()
		await draft.ok()

		draft.writer.touch()
		await vi.advanceTimersByTimeAsync(DRAFT_WRITE_DELAY_MS)
		expect(draft.sent).toHaveLength(1)
	})
})
