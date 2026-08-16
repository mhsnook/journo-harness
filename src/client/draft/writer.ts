import type { BlockRow, DraftChange, DraftSaved } from '../../shared/draft'

/**
 * The Draft's one writer. It watches for changes, reads the document when it is
 * time to save, and sends the Blocks that differ from what the Article Agent
 * has acknowledged.
 *
 * There is no React in here, which is what lets the cadence be tested against a
 * clock rather than against a rendered editor.
 */

/** How long a pause ends a burst of typing. */
export const DRAFT_WRITE_DELAY = 800

/** The longest a writer in flow goes unsaved. Without a ceiling, a debounce
 * that restarts on every keystroke never fires for someone who does not pause. */
export const DRAFT_MAX_WAIT = 5000

export type DraftStatus =
	| { state: 'clean' | 'pending' | 'saving'; savedAt: number | null }
	| { state: 'failed'; savedAt: number | null; failure: string }

export type DraftWriterOptions = {
	/**
	 * The Draft as the editor holds it now, orded against what came before.
	 *
	 * A callback rather than rows handed in, because reading the document means
	 * walking it and serialising every Block. Doing that per keystroke would
	 * make the writer the thing that makes typing feel slow; this way it happens
	 * once per save.
	 */
	read: (previous: readonly BlockRow[]) => readonly BlockRow[]
	save: (change: DraftChange) => Promise<DraftSaved>
	onStatus: (status: DraftStatus) => void
	/** The sentence a failed save shows. */
	describeFailure: (error: unknown) => string
	delay?: number
	maxWait?: number
}

export type DraftWriter = {
	readonly status: DraftStatus
	/** Seed from what the Article Agent already holds. Writes nothing. */
	load: (rows: readonly BlockRow[]) => void
	/** The editor changed. Schedules a save; reads nothing yet. */
	touch: () => void
	/** Send what is waiting, now. */
	flush: () => void
	/** Flush and stop. Re-usable: hiding the Draft Panel runs this, and showing
	 * it again has to carry on from the same baseline. */
	dispose: () => void
}

export function createDraftWriter(options: DraftWriterOptions): DraftWriter {
	const delay = options.delay ?? DRAFT_WRITE_DELAY
	const maxWait = options.maxWait ?? DRAFT_MAX_WAIT

	/** The last rows read out of the editor. Passed back to `read` so a Block
	 * keeps its ord across a save that failed. */
	let held: readonly BlockRow[] = []
	/** id → content, **as the Article Agent acknowledged it**. This is what a
	 * delta is measured against, so a failed save stays in the next one. */
	let saved = new Map<string, string>()

	let pause: ReturnType<typeof setTimeout> | null = null
	let ceiling: ReturnType<typeof setTimeout> | null = null
	let sending: DraftChange | null = null
	let dirty = false
	let status: DraftStatus = { state: 'clean', savedAt: null }

	const report = (next: DraftStatus) => {
		status = next
		options.onStatus(next)
	}

	const clear = () => {
		if (pause !== null) clearTimeout(pause)
		if (ceiling !== null) clearTimeout(ceiling)
		pause = null
		ceiling = null
	}

	const settled = (receipt: DraftSaved, sent: DraftChange) => {
		// The rows that were sent, not the ones on screen — the writer kept
		// typing while this was in flight, and those changes are still unsaved.
		for (const block of sent.blocks) saved.set(block.id, JSON.stringify(block.json))
		for (const id of sent.removed) saved.delete(id)

		sending = null
		report({ state: 'clean', savedAt: receipt.savedAt })

		if (dirty) {
			dirty = false
			// `touch` rather than `send`, so a writer in unbroken flow keeps one
			// cadence instead of saving again the moment the wire is free.
			schedule()
		}
	}

	const failed = (error: unknown, savedAt: number | null) => {
		// `saved` is deliberately not advanced: those Blocks ride the next save.
		// Nothing retries on a timer — the typing is the retry, and a loop
		// against a server that is refusing is a loop.
		sending = null
		report({ state: 'failed', savedAt, failure: options.describeFailure(error) })
	}

	const send = () => {
		clear()

		if (sending !== null) {
			dirty = true
			return
		}

		held = options.read(held)

		const blocks = held.filter((row) => saved.get(row.id) !== JSON.stringify(row.json))
		const live = new Set(held.map((row) => row.id))
		const removed = [...saved.keys()].filter((id) => !live.has(id))

		if (blocks.length === 0 && removed.length === 0) {
			report({ state: 'clean', savedAt: status.savedAt })
			return
		}

		const change: DraftChange = { blocks: [...blocks], removed }
		const savedAt = status.savedAt

		sending = change
		report({ state: 'saving', savedAt })
		options.save(change).then(
			(receipt) => settled(receipt, change),
			(error: unknown) => failed(error, savedAt),
		)
	}

	const schedule = () => {
		if (pause !== null) clearTimeout(pause)
		pause = setTimeout(send, delay)

		// Started once and never restarted. A ceiling that resets on a keystroke
		// is a second debounce, which is the thing it exists to backstop.
		if (ceiling === null) ceiling = setTimeout(send, maxWait)
	}

	return {
		get status() {
			return status
		},

		load(rows) {
			held = rows
			saved = new Map(rows.map((row) => [row.id, JSON.stringify(row.json)]))
			report({ state: 'clean', savedAt: null })
		},

		touch() {
			if (status.state === 'clean') report({ state: 'pending', savedAt: status.savedAt })
			schedule()
		},

		flush: send,
		dispose() {
			send()
			clear()
		},
	}
}
