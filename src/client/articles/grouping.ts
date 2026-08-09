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

/**
 * The tiles the list puts on top, newest change first. Sorted here rather than
 * leaning on the index route's `ORDER BY`, so the View owns the rule it draws
 * and pagination cannot quietly turn it into "the first three rows".
 *
 * They supplement the list rather than replacing rows in it: every one of them
 * is still listed underneath.
 */
export function recentArticles(
	articles: readonly ArticleEntry[],
	count = 3,
): ArticleEntry[] {
	return unarchivedArticles(articles)
		.toSorted((one, two) => two.updatedAt - one.updatedAt)
		.slice(0, count)
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
