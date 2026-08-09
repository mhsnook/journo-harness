import {
	ARTICLE_STATUSES,
	type ArticleEntry,
	type ArticleStatus,
	isArchived,
	statusLabel,
} from '../../shared/article'

/** How the two Views cut the one list the index answers with. */

export type BoardColumn = {
	status: ArticleStatus
	label: string
	articles: ArticleEntry[]
}

export function unarchivedArticles(articles: readonly ArticleEntry[]): ArticleEntry[] {
	return articles.filter((article) => !isArchived(article))
}

export function archivedArticles(articles: readonly ArticleEntry[]): ArticleEntry[] {
	return articles.filter(isArchived)
}

export const recentCount = 3

/**
 * The tiles the list puts on top — the newest first, since that is the order the
 * index answers in. They supplement the list rather than replacing rows in it:
 * every one of them is still listed underneath.
 */
export function recentArticles(
	articles: readonly ArticleEntry[],
	count = recentCount,
): ArticleEntry[] {
	return unarchivedArticles(articles).slice(0, count)
}

/**
 * Every column, empty ones included — a board missing one reads as though that
 * stage does not exist. Done is a column rather than a filter, because a Done
 * Article stays on the Board until it is Archived (context.md).
 */
export function boardColumns(articles: readonly ArticleEntry[]): BoardColumn[] {
	const shown = unarchivedArticles(articles)

	return ARTICLE_STATUSES.map((status) => ({
		status,
		label: statusLabel[status],
		articles: shown.filter((article) => article.status === status),
	}))
}
