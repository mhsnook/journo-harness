import {
	type QueryClient,
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from '@tanstack/react-query'

import type { ArticleEdit, ArticleEntry } from '../../shared/article'
import { failureText } from '../lib/failure'
import { editArticle, fetchArticles } from './api'

/**
 * The article index through TanStack Query — §8. One key holds the whole table:
 * one Team's index is small enough to send whole, and both Views read it.
 */

export const articlesKey = ['articles'] as const

/** Named once, so a route's loader primes exactly what its component reads. */
export const articlesQuery = queryOptions({
	queryKey: articlesKey,
	queryFn: fetchArticles,
})

/**
 * Splices a row the server just answered with into the cached list, rather than
 * invalidating and reading the whole table back. Every write route returns the
 * row it wrote, so the list already has what a refetch would fetch — and the
 * Article screen holds this query too, so an invalidation there costs a
 * whole-table GET per rename.
 */
export function keepArticle(client: QueryClient, article: ArticleEntry): void {
	client.setQueryData<ArticleEntry[]>(articlesKey, (held) => {
		const rows = held ?? []
		const at = rows.findIndex((one) => one.id === article.id)

		return at === -1 ? [article, ...rows] : rows.toSpliced(at, 1, article)
	})
}

/** The other half, for a row the writer discarded. */
export function dropArticle(client: QueryClient, id: string): void {
	client.setQueryData<ArticleEntry[]>(articlesKey, (held) =>
		(held ?? []).filter((one) => one.id !== id),
	)
}

export type ArticleWriter = {
	edit: (id: string, edit: ArticleEdit) => void
	/** Why the last write did not land. */
	failure: string | null
}

/** Changing a row, for any screen that has one to change. */
export function useEditArticle(): ArticleWriter {
	const client = useQueryClient()

	const edited = useMutation({
		mutationFn: ({ id, edit }: { id: string; edit: ArticleEdit }) =>
			editArticle(id, edit),
		onSuccess: (article) => keepArticle(client, article),
	})

	return {
		edit: (id, edit) => edited.mutate({ id, edit }),
		failure: failureText("That change didn't save.", edited.error),
	}
}

export type ArticleIndex = ArticleWriter & { articles: ArticleEntry[] }

/**
 * The Area's read. **It suspends.** A View drawn before the rows arrive is a
 * list of nothing that is not empty — zero counts, "nothing here yet", and four
 * bare columns — so the route holds a loader up instead and the Views only ever
 * see rows they can trust.
 */
export function useArticleIndex(): ArticleIndex {
	const { data } = useSuspenseQuery(articlesQuery)

	return { articles: data, ...useEditArticle() }
}

/**
 * One row out of the list, without waiting for it. The Article screen reads its
 * status through this and shows the Chat and the Plan meanwhile — those come off
 * the socket and have nothing to do with the index.
 */
export function useArticleEntry(id: string): ArticleEntry | undefined {
	const { data } = useQuery(articlesQuery)

	return data?.find((article) => article.id === id)
}
