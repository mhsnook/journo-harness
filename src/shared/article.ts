import { z } from 'zod'

/**
 * The article index: one row per Article, and the only record of an Article that
 * lives outside its Article Agent — docs/architecture.md §9.
 *
 * **The index is a list, not a store.** It carries what a list needs to render a
 * row and nothing that duplicates the Plan, so losing the whole table costs the
 * reader their list and costs no Article anything. The title is the one field
 * that lives in two places, and the Plan holds the real one.
 */

/**
 * How far along the writer says a piece is. Nothing infers it: 1a has no Draft
 * to measure, so the writer sets it on the Article screen and the Board View
 * reads it.
 */
export const articleStatusSchema = z.enum(['planning', 'drafting', 'self-edit', 'done'])
export type ArticleStatus = z.infer<typeof articleStatusSchema>

/** The order the Board View draws its columns in, and the order a picker offers.
 * A new Article starts at the first of them. */
export const ARTICLE_STATUSES = articleStatusSchema.options

export const statusLabel: Record<ArticleStatus, string> = {
	planning: 'Planning',
	drafting: 'Drafting',
	'self-edit': 'Self-edit',
	done: 'Done',
}

export const articleEntrySchema = z.strictObject({
	id: z.string().min(1),
	/** A copy of the Plan's title, written by the same client action that renames
	 * the Article. Empty until the writer types one, and a stale copy is a wrong
	 * row rather than a lost Article. */
	title: z.string(),
	status: articleStatusSchema,
	createdAt: z.number().int(),
	/** When this row last changed — a rename, a status, or Archiving. It is not
	 * when the Article was last worked on: a Plan edit goes to the Article Agent
	 * and never touches this table. */
	updatedAt: z.number().int(),
	/** Null until the writer Archives it. An Archived Article stays on this
	 * table rather than moving to one of its own. */
	archivedAt: z.number().int().nullable(),
})

export type ArticleEntry = z.infer<typeof articleEntrySchema>

/** What the list route answers with. */
export const articleListSchema = z.object({ articles: z.array(articleEntrySchema) })

/** What one write route answers with. */
export const articleReplySchema = z.object({ article: articleEntrySchema })

/** What creating an Article takes. A title is accepted so a caller may open one
 * that is already named, and the usual case sends nothing. */
export const newArticleSchema = z.strictObject({ title: z.string().optional() })

/** What editing a row takes. At least one field, or there is nothing to write. */
export const articleEditSchema = z
	.strictObject({
		title: z.string().optional(),
		status: articleStatusSchema.optional(),
		archived: z.boolean().optional(),
	})
	.refine((edit) => Object.values(edit).some((field) => field !== undefined), {
		error: 'An edit changes at least one of title, status, or archived.',
	})

export type ArticleEdit = z.infer<typeof articleEditSchema>

/** What a list shows where the writer has typed no title. The Plan Panel's
 * placeholder reads the same, because it is the same absence. */
export const untitledArticle = 'Untitled article'

export function articleTitle(article: ArticleEntry): string {
	return article.title.trim() === '' ? untitledArticle : article.title
}

export function isArchived(article: ArticleEntry): boolean {
	return article.archivedAt !== null
}
