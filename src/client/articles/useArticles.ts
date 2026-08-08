import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { ArticleEdit, ArticleEntry } from '../../shared/article'
import { failureText } from '../lib/failure'
import { createArticle, editArticle, fetchArticles } from './api'

/**
 * The article index through TanStack Query — §8. One query key holds the whole
 * table, because one Team's index is small enough to send whole and both Views
 * read the same rows.
 */

export const articlesKey = ['articles'] as const

export type ArticleIndex = {
	articles: ArticleEntry[]
	/** Until the first read answers. */
	loading: boolean
	/** The first thing that went wrong, as one sentence. */
	failure: string | null
	/** Opens an Article and hands back its id, so the caller can redirect into
	 * it. The Article Agent is not woken here — it builds itself on the first
	 * connect. */
	create: (opened: (id: string) => void) => void
	edit: (id: string, edit: ArticleEdit) => void
}

export function useArticleIndex(): ArticleIndex {
	const client = useQueryClient()
	const listed = useQuery({ queryKey: articlesKey, queryFn: fetchArticles })

	const reread = () => client.invalidateQueries({ queryKey: articlesKey })
	const created = useMutation({ mutationFn: createArticle, onSuccess: reread })
	const edited = useMutation({
		mutationFn: ({ id, edit }: { id: string; edit: ArticleEdit }) =>
			editArticle(id, edit),
		onSuccess: reread,
	})

	return {
		articles: listed.data ?? [],
		loading: listed.isPending,
		failure:
			failureText("Your Articles didn't load.", listed.error) ??
			failureText("The Article wasn't created.", created.error) ??
			failureText("That change didn't save.", edited.error),

		create: (opened) => {
			created.mutate(undefined, { onSuccess: (article) => opened(article.id) })
		},
		edit: (id, edit) => edited.mutate({ id, edit }),
	}
}
