import {
	type QueryClient,
	useMutation,
	useQuery,
	useQueryClient,
} from '@tanstack/react-query'

import type { ArticleEdit, ArticleEntry } from '../../shared/article'
import { failureText } from '../lib/failure'
import { editArticle, fetchArticles } from './api'

/**
 * The article index through TanStack Query — §8. One key holds the whole table:
 * one Team's index is small enough to send whole, and both Views read it.
 */

export const articlesKey = ['articles'] as const

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

export type ArticleIndex = {
	articles: ArticleEntry[]
	loading: boolean
	/** The first thing that went wrong, as one sentence. */
	failure: string | null
	edit: (id: string, edit: ArticleEdit) => void
}

export function useArticleIndex(): ArticleIndex {
	const client = useQueryClient()
	const listed = useQuery({ queryKey: articlesKey, queryFn: fetchArticles })

	const edited = useMutation({
		mutationFn: ({ id, edit }: { id: string; edit: ArticleEdit }) =>
			editArticle(id, edit),
		onSuccess: (article) => keepArticle(client, article),
	})

	return {
		articles: listed.data ?? [],
		loading: listed.isPending,
		failure:
			failureText("Your Articles didn't load.", listed.error) ??
			failureText("That change didn't save.", edited.error),

		edit: (id, edit) => edited.mutate({ id, edit }),
	}
}

/** One row out of the list already loaded, rather than a request of its own. */
export function useArticleEntry(id: string): ArticleEntry | undefined {
	const { data } = useQuery({ queryKey: articlesKey, queryFn: fetchArticles })

	return data?.find((article) => article.id === id)
}
