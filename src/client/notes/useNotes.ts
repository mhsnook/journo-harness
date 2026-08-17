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
import { type AnchorNaming, anchorNaming } from './anchors'

/**
 * The Notes Panel's half of one Article Agent — the Rounds, the Notes, and the
 * one action that makes more of both.
 *
 * Rows come down once, since nothing announces a row changing (§3). The two
 * things that change them behind this client's back are a Review it started,
 * which announces itself, and a second tab, which does not.
 */

export type NotesHandle = {
	queue: NotesQueue
	/** Every Note, unfiltered. The written response draws the Notes it named
	 * whatever the queue is currently showing. */
	notes: readonly Note[]
	/** Every Round, oldest first. */
	rounds: readonly Round[]
	/** The Review in flight, and null when none is. */
	running: Round | null
	/** Until the first read answers. */
	loading: boolean
	failure: string | null
	view: QueueView
	setView: (view: QueueView) => void
	/** How an anchor is turned into "¶3" or "§2". */
	naming: AnchorNaming
	accept: (note: Note) => void
	decline: (note: Note) => void
	resolve: (note: Note) => void
	restore: (note: Note) => void
	runReview: (prompt: string, depth: ReviewDepth) => void
}

/** How often a waiting client checks a Review it has heard nothing about.
 * The broadcast is the signal; this covers a socket that dropped while the
 * Review ran, which would otherwise leave "reviewing…" on screen for good. */
const WAITING_POLL = 5_000

export function useNotes(): NotesHandle {
	const { notes: store, draft, plan: connection } = useArticle()

	const [notes, setNotes] = useState<Note[] | null>(null)
	const [rounds, setRounds] = useState<Round[] | null>(null)
	const [blocks, setBlocks] = useState<BlockRow[]>([])
	const [failure, setFailure] = useState<string | null>(null)
	const [view, setView] = useState<QueueView>(wholeQueue)
	const [reads, setReads] = useState(0)

	const reload = useCallback(() => setReads((count) => count + 1), [])

	// The Blocks ride along because a Note's anchor is read against them. They
	// are the Draft as the Article Agent last had it, which is the same copy the
	// Review itself read — so the numbers on a Note match the paragraphs the
	// model was looking at, even when the writer has typed since.
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
	}, [store, draft, reads])

	// The Article Agent says when a Review settles, because the writer is waiting
	// on that one and nothing else would tell them.
	useEffect(() => store.onReviewFinished(reload), [store, reload])

	const running = (rounds ?? []).find((round) => round.state === 'running') ?? null

	useEffect(() => {
		if (running === null) return

		const timer = setInterval(reload, WAITING_POLL)

		return () => clearInterval(timer)
	}, [running, reload])

	/** In place: a ruling does not change the order the Guide wrote them in. */
	function replace(ruled: Note) {
		setNotes((held) => (held ?? []).map((note) => (note.id === ruled.id ? ruled : note)))
	}

	function rule(what: string, write: () => Promise<Note>) {
		setFailure(null)
		write().then(replace, (error: unknown) => setFailure(failureText(what, error)))
	}

	return {
		queue: notesQueue(notes ?? [], view),
		notes: notes ?? [],
		rounds: rounds ?? [],
		running,
		loading: notes === null,
		failure,
		view,
		setView,
		naming: anchorNaming(connection.plan, blocks),

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

		runReview: (prompt, depth) => {
			setFailure(null)

			const asked = prompt.trim()
			if (asked === '') return

			store
				.startReview({
					prompt: asked,
					depth,
					// The Plan the writer is looking at, which may be newer than the one
					// the Article Agent has stored — the same reason a Chat turn sends
					// it (§6).
					...(connection.plan === null ? {} : { plan: connection.plan }),
				})
				.then(
					(round) => setRounds((held) => [...(held ?? []), round]),
					(error: unknown) => setFailure(failureText('The Review did not start.', error)),
				)
		},
	}
}
