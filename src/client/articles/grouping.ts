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
 * The Board View's columns: the unarchived Articles by status, in the order
 * `ARTICLE_STATUSES` lists them.
 *
 * Every column is returned, empty ones included — a board with a column missing
 * reads as though that stage does not exist. A Done Article stays on the Board
 * until it is Archived (context.md), so `done` is the last column rather than a
 * thing the Board leaves out.
 */
export function boardColumns(articles: readonly ArticleEntry[]): BoardColumn[] {
	const shown = unarchivedArticles(articles)

	return ARTICLE_STATUSES.map((status) => ({
		status,
		label: statusLabel[status],
		articles: shown.filter((article) => article.status === status),
	}))
}
