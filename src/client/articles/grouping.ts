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

/** How many Articles the list highlights as tiles above itself. */
export const recentCount = 3

/**
 * The Articles the list puts on top as tiles. The index answers newest change
 * first, so these are the ones the writer touched last.
 *
 * **They supplement the list rather than replacing rows in it.** Every Article
 * below is still listed, so a writer scanning the list never has to remember
 * that the top few were lifted out of it.
 */
export function recentArticles(
	articles: readonly ArticleEntry[],
	count = recentCount,
): ArticleEntry[] {
	return unarchivedArticles(articles).slice(0, count)
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
