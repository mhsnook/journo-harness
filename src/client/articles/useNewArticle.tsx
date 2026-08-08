import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { type FormEvent, type ReactNode, useRef, useState } from 'react'

import type { ArticleEntry } from '../../shared/article'
import { Button } from '../components/Button'
import { Dialog } from '../components/Dialog'
import { TextField } from '../components/Field'
import { Notice } from '../components/Notice'
import { failureText } from '../lib/failure'
import { createArticle, discardArticle } from './api'
import { articlesKey } from './useArticles'

declare module '@tanstack/react-router' {
	interface HistoryState {
		/** The title the new-Article dialog collected, carried into the Article
		 * screen. It goes to the Plan there and the index copy follows it, so the
		 * Plan stays the one that names the Article — §9. Lost on a reload, which
		 * is right: by then the Plan write has landed. */
		newTitle?: string
	}
}

/**
 * Opening an Article: the row is created the moment the writer asks for one, and
 * the dialog asks what to call it while that request is in flight. By the time
 * they have typed a title the id is usually already back, so naming a piece
 * costs no round trip anybody waits on.
 *
 * **The typed title travels into the Article screen rather than being written
 * here.** The Plan holds the real title and the index holds a copy (§9), so
 * writing it from this page would put the copy in front of the thing it copies.
 *
 * **Backing out throws the row away.** Nothing is destroyed: an Article nobody
 * has opened has no Plan and no Chat, because its Article Agent is not built
 * until the Article screen connects to it.
 */

export type NewArticleFlow = {
	/** Creates the row and opens the dialog. */
	start: () => void
	/** Render it inside the route. */
	dialog: ReactNode
}

export function useNewArticle(): NewArticleFlow {
	const client = useQueryClient()
	const navigate = useNavigate()

	const [naming, setNaming] = useState(false)
	const [opening, setOpening] = useState(false)
	const [failure, setFailure] = useState<string | null>(null)

	// The request itself, kept rather than its result: the writer may confirm
	// before it answers, and awaiting this promise is the whole coordination.
	// Null once it has been spent, or after it failed and wants reissuing.
	const made = useRef<Promise<ArticleEntry> | null>(null)

	const reread = () => client.invalidateQueries({ queryKey: articlesKey })

	/** Swallowed here and reported at the point the writer is waiting on it, so a
	 * failure while they are still typing is not an unhandled rejection. */
	const begin = () => {
		const request = createArticle()
		request.catch(() => {})
		made.current = request

		return request
	}

	const start = () => {
		// A second click on the button behind the dialog would strand the first row.
		if (naming) return

		setFailure(null)
		setOpening(false)
		setNaming(true)
		begin()
	}

	const confirm = (title: string) => {
		setOpening(true)
		setFailure(null)

		// Null where the last attempt failed, and then this is the retry.
		const request = made.current ?? begin()

		request.then(
			(article) => {
				made.current = null
				setNaming(false)
				setOpening(false)
				reread()
				navigate({
					to: '/a/$articleId',
					params: { articleId: article.id },
					state: { newTitle: title.trim() },
				})
			},
			(error: unknown) => {
				// The dialog stays up holding what they typed.
				made.current = null
				setOpening(false)
				setFailure(failureText("The Article wasn't created.", error))
			},
		)
	}

	const cancel = () => {
		const request = made.current
		made.current = null
		setNaming(false)
		setOpening(false)
		setFailure(null)

		// Null after a confirm, which is what stops the close this triggers from
		// discarding the Article the writer is on their way into.
		request?.then(
			(article) => discardArticle(article.id).then(reread, () => {}),
			() => {},
		)
	}

	return {
		start,
		dialog: (
			<NewArticleDialog
				failure={failure}
				onCancel={cancel}
				onConfirm={confirm}
				open={naming}
				opening={opening}
			/>
		),
	}
}

/** The title of the Article this navigation opened, where the dialog collected
 * one. `useSeedTitle` writes it into the Plan. */
export function useNewTitle(): string | undefined {
	return useLocation({ select: (location) => location.state.newTitle })
}

function NewArticleDialog({
	open,
	opening,
	failure,
	onConfirm,
	onCancel,
}: {
	open: boolean
	/** The row is not back yet, so opening it waits on the request. */
	opening: boolean
	failure: string | null
	onConfirm: (title: string) => void
	onCancel: () => void
}) {
	const [title, setTitle] = useState('')

	const submit = (event: FormEvent) => {
		event.preventDefault()
		onConfirm(title)
	}

	// Closing forgets what was typed, so the next one starts on an empty field.
	const cancel = () => {
		setTitle('')
		onCancel()
	}

	return (
		<Dialog
			actions={
				<>
					<Button onClick={cancel} size="sm" variant="quiet">
						cancel
					</Button>
					<Button
						disabled={opening}
						form="new-article"
						size="sm"
						type="submit"
						variant="accent"
					>
						{opening ? 'opening…' : 'start writing'}
					</Button>
				</>
			}
			onClose={cancel}
			open={open}
			subtitle="You can change it in the Plan later, and leaving it empty is fine."
			title="What is this piece called?"
		>
			{failure === null ? null : <Notice>{failure}</Notice>}
			<form id="new-article" onSubmit={submit}>
				<TextField
					hiddenLabel="Article title"
					onChange={setTitle}
					placeholder="Untitled article"
					value={title}
				/>
			</form>
		</Dialog>
	)
}
