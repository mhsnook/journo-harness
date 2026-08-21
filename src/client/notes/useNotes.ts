import { useCallback, useEffect, useState } from 'react'

import type { BlockRow } from '../../shared/draft'
import type { Note } from '../../shared/note'
import {
	type NotesQueue,
	notesQueue,
	type QueueView,
	wholeQueue,
} from '../../shared/notes-queue'
import type { ReviewDepth, Round } from '../../shared/review'
import { useArticle } from '../lib/article'
import { failureText } from '../lib/failure'
import type { NoteActions } from './actions'
import { type AnchorNaming, anchorNaming } from './anchors'

/** The Notes Panel's half of one Article Agent. Rows come down once, since
 * nothing announces a row changing (§3). */

export type NotesHandle = {
	queue: NotesQueue
	/** Every Note, unfiltered — a Round's response draws the ones it named
	 * whatever the queue is showing. */
	notes: readonly Note[]
	rounds: readonly Round[]
	loading: boolean
	failure: string | null
	view: QueueView
	setView: (view: QueueView) => void
	naming: AnchorNaming
	actions: NoteActions
	runReview: (prompt: string, depth: ReviewDepth) => void
}

/** The broadcast is the signal a Review settled; this only covers a socket that
 * dropped while one ran. */
const WAITING_POLL = 5_000

/** The next tick tries again, and the writer is already told a Review is
 * running. */
const ignore = () => {}

export function useNotes(): NotesHandle {
	const { notes: store, draft, reviewFinished, plan: connection } = useArticle()

	const [notes, setNotes] = useState<Note[] | null>(null)
	const [rounds, setRounds] = useState<Round[] | null>(null)
	const [blocks, setBlocks] = useState<BlockRow[]>([])
	const [failure, setFailure] = useState<string | null>(null)
	const [view, setView] = useState<QueueView>(wholeQueue)
	const [reads, setReads] = useState(0)

	const reload = useCallback(() => setReads((count) => count + 1), [])

	// The Blocks ride along because a Note's anchor is read against them, and
	// this is the Draft as the Review itself read it — so "¶3" on a card is the
	// paragraph the model was looking at, even if the writer has typed since.
	useEffect(() => {
		let live = true

		Promise.all([store.listRounds(), store.listNotes(), draft.listBlocks()]).then(
			([listedRounds, listedNotes, listedBlocks]) => {
				if (!live) return

				setRounds(listedRounds)
				setNotes(listedNotes)
				setBlocks(listedBlocks)
			},
			(error: unknown) => {
				if (live) setFailure(failureText('The Notes did not load.', error))
			},
		)

		return () => {
			live = false
		}
		// `reviewFinished` is a dependency rather than its own effect: a Review
		// settling is another reason to read, not a reason to set state that then
		// causes one.
	}, [store, draft, reads, reviewFinished])

	// The Panel derives the running Round for itself off `rounds`; this one is
	// for the poll below.
	const running = (rounds ?? []).find((round) => round.state === 'running') ?? null
	const waitingOn = running === null ? null : running.id

	// Reads the Rounds alone: the full load would pull the whole Draft back on
	// every tick to answer one question about one row.
	useEffect(() => {
		if (waitingOn === null) return

		let live = true

		const check = () => {
			store.listRounds().then((listed) => {
				if (!live) return

				setRounds(listed)
				const still = listed.find((round) => round.id === waitingOn)
				if (still?.state !== 'running') reload()
			}, ignore)
		}

		const timer = setInterval(check, WAITING_POLL)

		return () => {
			live = false
			clearInterval(timer)
		}
	}, [store, waitingOn, reload])

	const actions: NoteActions = (() => {
		/** In place: a ruling does not change the order the Guide wrote them in. */
		const replace = (ruled: Note) =>
			setNotes((held) =>
				(held ?? []).map((note) => (note.id === ruled.id ? ruled : note)),
			)

		const rule = (what: string, write: () => Promise<Note>) => {
			setFailure(null)
			write().then(replace, (error: unknown) => setFailure(failureText(what, error)))
		}

		return {
			accept: (note) =>
				rule('This Note was not accepted.', () =>
					store.setNoteDisposition(note.id, 'accepted'),
				),
			decline: (note) =>
				rule('This Note was not declined.', () =>
					store.setNoteDisposition(note.id, 'declined'),
				),
			resolve: (note) =>
				rule('This Note was not resolved.', () => store.resolveNote(note.id)),
			restore: (note) =>
				rule('This Note was not restored.', () => store.restoreNote(note.id)),
		}
	})()

	const queue = notesQueue(notes ?? [], view)
	const naming = anchorNaming(connection.plan, blocks)

	return {
		queue,
		notes: notes ?? [],
		rounds: rounds ?? [],
		loading: notes === null,
		failure,
		view,
		setView,
		naming,
		actions,

		runReview: (prompt, depth) => {
			setFailure(null)

			const asked = prompt.trim()
			if (asked === '') return

			store
				.startReview({
					prompt: asked,
					depth,
					// May be newer than the Plan the Article Agent has stored — §6.
					...(connection.plan === null ? {} : { plan: connection.plan }),
				})
				.then(
					(round) => setRounds((held) => [...(held ?? []), round]),
					(error: unknown) => setFailure(failureText('The Review did not start.', error)),
				)
		},
	}
}
