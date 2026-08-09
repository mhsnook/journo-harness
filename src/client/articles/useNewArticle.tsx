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
		/** The title the new-Article dialog collected. Lost on a reload, which is
		 * right: by then it has landed in the Plan. */
		newTitle?: string
	}
}

/**
 * Opening an Article: the row is created the moment the writer asks for one, and
 * the dialog asks what to call it while that request is still in flight.
 *
 * The typed title travels on the navigation rather than being written here —
 * writing it from this page would put the index copy in front of the Plan it
 * copies (docs/architecture.md §9).
 */

export type NewArticleFlow = {
	/** Creates the row and opens the dialog. */
	start: () => void
	dialog: ReactNode
}

export function useNewArticle(): NewArticleFlow {
	const client = useQueryClient()
	const navigate = useNavigate()

	const [naming, setNaming] = useState(false)
	const [opening, setOpening] = useState(false)
	const [failure, setFailure] = useState<string | null>(null)

	// The request rather than its result: the writer may confirm before it
	// answers, and awaiting this promise is the whole coordination.
	const made = useRef<Promise<ArticleEntry> | null>(null)

	const reread = () => client.invalidateQueries({ queryKey: articlesKey })

	/** The `catch` is not the handler — it keeps a failure while the writer is
	 * still typing from being an unhandled rejection. `confirm` reports it. */
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
				// Left open, holding what they typed, so confirming again retries.
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

		// A confirm nulls this first, so the close it causes reaches here and
		// discards nothing. Otherwise it would throw away the Article the writer
		// is on their way into.
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

/** What `useSeedTitle` writes into the Plan. */
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
	/** Waiting on the create before it can redirect. */
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
