import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { editArticle } from '../articles/api'
import { articlesKey } from '../articles/useArticles'
import { failureText } from '../lib/failure'

/**
 * The index's copy of the title, written after the Plan's own write.
 *
 * The title is the one field that lives in two places — architecture.md §9. The
 * Plan holds the real one, and this follows it: renaming is an `edit` with
 * `setTitle` on `nodeId: null`, this hook sees the Plan that comes back, and the
 * copy goes out behind it. **The Plan goes first on purpose.** A Plan write that
 * lands with a failed copy leaves a stale row that the next rename corrects,
 * where the other order leaves the list ahead of the Plan with nothing to walk
 * it back — the same argument §5 makes about Accepting an Offer.
 *
 * It debounces beside the Plan's own writer rather than sending per keystroke,
 * and flushes on the way out, which is what keeps the last letter of a rename
 * the writer types on their way back to the list.
 *
 * Returns the sentence for a copy that did not land, so a wrong row is something
 * the writer is told about rather than something they find later. A flush on the
 * way out is the exception: the screen that would show it has gone.
 */

/** Long enough to swallow a burst of typing, short enough that leaving the
 * Article screen normally finds nothing left to flush. */
const pause = 600

export function useTitleCopy(articleId: string, title: string | null): string | null {
	const client = useQueryClient()
	const [failure, setFailure] = useState<string | null>(null)

	// `sent` is the last title this hook has accounted for, and `pending` is one a
	// debounce is still holding. Refs, because a rename must not re-run the
	// effect that decides whether it is a rename.
	const held = useRef<{ sent: string | null; pending: string | null }>({
		sent: null,
		pending: null,
	})

	function write(next: string) {
		held.current.pending = null
		setFailure(null)

		editArticle(articleId, { title: next }).then(
			() => client.invalidateQueries({ queryKey: articlesKey }),
			(error: unknown) =>
				setFailure(failureText("The list's copy of the title didn't save.", error)),
		)
	}

	// The flush below fires from a cleanup, which closes over the render it was
	// set up in. This is how it reaches the current one instead.
	const send = useRef(write)
	useEffect(() => {
		send.current = write
	})

	useEffect(() => {
		if (title === null) return

		const state = held.current

		// The first Plan to arrive is the one the index already has a copy of.
		// Writing it back would be a request per page load that changes nothing.
		if (state.sent === null) {
			state.sent = title
			return
		}
		if (title === state.sent) return

		state.sent = title
		state.pending = title
		const timer = setTimeout(() => send.current(title), pause)

		return () => clearTimeout(timer)
	}, [title])

	// Runs after the effect above has cleared its timer, so what is left is a
	// rename the debounce never got to send.
	useEffect(() => {
		const state = held.current

		return () => {
			if (state.pending !== null) send.current(state.pending)
		}
	}, [])

	return failure
}
