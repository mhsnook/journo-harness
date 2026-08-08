import { describe, expect, it } from 'vitest'

import { nextOpenPanels } from '../../src/client/article/usePanels'
import {
	archivedArticles,
	boardColumns,
	unarchivedArticles,
} from '../../src/client/articles/grouping'
import { shortDate } from '../../src/client/lib/when'
import {
	type ArticleEntry,
	type ArticleStatus,
	articleEditSchema,
	articleTitle,
	untitledArticle,
} from '../../src/shared/article'

/** The arithmetic behind the two Views on the article index, and the rail that
 * decides which Panels an Article screen shows. */

function entry(
	id: string,
	status: ArticleStatus,
	archivedAt: number | null = null,
): ArticleEntry {
	return { id, title: id, status, createdAt: 1, updatedAt: 1, archivedAt }
}

describe('splitting the index', () => {
	const articles = [
		entry('a', 'planning'),
		entry('b', 'drafting', 200),
		entry('c', 'done'),
	]

	it('leaves an Archived Article out of what is in progress', () => {
		expect(unarchivedArticles(articles).map((one) => one.id)).toEqual(['a', 'c'])
	})

	it('gathers the Archived ones', () => {
		expect(archivedArticles(articles).map((one) => one.id)).toEqual(['b'])
	})
})

describe('the Board View’s columns', () => {
	it('draws every status, empty ones included', () => {
		const columns = boardColumns([entry('a', 'planning')])

		expect(columns.map((column) => column.status)).toEqual([
			'planning',
			'drafting',
			'self-edit',
			'done',
		])
		expect(columns.map((column) => column.articles.length)).toEqual([1, 0, 0, 0])
	})

	it('keeps a Done Article on the Board until it is Archived', () => {
		const [, , , done] = boardColumns([entry('a', 'done')])

		expect(done.articles.map((one) => one.id)).toEqual(['a'])
	})

	it('drops an Archived Article from every column', () => {
		const columns = boardColumns([entry('a', 'drafting', 200)])

		expect(columns.every((column) => column.articles.length === 0)).toBe(true)
	})

	it('names each column for a reader rather than by its key', () => {
		expect(boardColumns([]).map((column) => column.label)).toEqual([
			'Planning',
			'Drafting',
			'Self-edit',
			'Done',
		])
	})
})

describe('an Article with no title', () => {
	it('reads as untitled rather than as an empty row', () => {
		expect(articleTitle(entry('a', 'planning'))).toBe('a')
		expect(articleTitle({ ...entry('a', 'planning'), title: '   ' })).toBe(
			untitledArticle,
		)
	})
})

describe('editing a row', () => {
	it('refuses an edit that changes nothing', () => {
		expect(articleEditSchema.safeParse({}).success).toBe(false)
	})

	it('takes one field on its own', () => {
		expect(articleEditSchema.safeParse({ archived: true }).success).toBe(true)
	})

	it('refuses a status the Board has no column for', () => {
		expect(articleEditSchema.safeParse({ status: 'shipped' }).success).toBe(false)
	})
})

describe('the Panel rail', () => {
	it('selects one Panel on a narrow screen', () => {
		expect(nextOpenPanels(['chat', 'plan'], 'notes', true)).toEqual(['notes'])
	})

	it('opens a Panel into its own place in the order', () => {
		expect(nextOpenPanels(['chat', 'notes'], 'plan', false)).toEqual([
			'chat',
			'plan',
			'notes',
		])
	})

	it('closes a Panel that is open', () => {
		expect(nextOpenPanels(['chat', 'plan'], 'chat', false)).toEqual(['plan'])
	})

	it('keeps the last Panel open rather than leaving nothing on screen', () => {
		expect(nextOpenPanels(['plan'], 'plan', false)).toEqual(['plan'])
	})
})

describe('a date in a list', () => {
	it('leaves this year off and states any other', () => {
		const inYear = Date.UTC(2026, 2, 4)
		const before = Date.UTC(2025, 2, 4)

		expect(shortDate(inYear, Date.UTC(2026, 7, 8))).toBe('4 mar')
		expect(shortDate(before, Date.UTC(2026, 7, 8))).toBe('4 mar 2025')
	})
})
