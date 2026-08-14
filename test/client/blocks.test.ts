import { describe, expect, it } from 'vitest'

import { type BlockRow, assignOrds } from '../../src/client/draft/blocks'

const entries = (...ids: string[]) => ids.map((id) => ({ id, text: id }))

/** Ords the given ids as if from empty. */
const fresh = (...ids: string[]) => assignOrds(entries(...ids), [])

const ords = (rows: readonly BlockRow[]) =>
	Object.fromEntries(rows.map((row) => [row.id, row.ord]))

describe('assignOrds', () => {
	it('numbers a new Draft from one', () => {
		expect(ords(fresh('a', 'b', 'c'))).toEqual({ a: 1, b: 2, c: 3 })
	})

	it('leaves every ord alone when only the text changed', () => {
		const before = fresh('a', 'b', 'c')
		const after = assignOrds(
			[{ id: 'a', text: 'rewritten' }, ...entries('b', 'c')],
			before,
		)

		expect(ords(after)).toEqual(ords(before))
		expect(after[0].text).toBe('rewritten')
	})

	it('gives an inserted Block the midpoint and renumbers no neighbour', () => {
		const before = fresh('a', 'b')
		const after = assignOrds(entries('a', 'new', 'b'), before)

		expect(ords(after)).toEqual({ a: 1, new: 1.5, b: 2 })
	})

	it('keeps splitting the same gap without disturbing the ends', () => {
		let rows = fresh('a', 'b')
		rows = assignOrds(entries('a', 'x', 'b'), rows)
		rows = assignOrds(entries('a', 'x', 'y', 'b'), rows)

		expect(ords(rows)).toEqual({ a: 1, x: 1.5, y: 1.75, b: 2 })
	})

	it('appends past the last ord rather than between', () => {
		const rows = assignOrds(entries('a', 'b', 'c'), fresh('a', 'b'))
		expect(rows[2].ord).toBeGreaterThan(rows[1].ord)
	})

	it('renumbers a Block that moved and leaves the ones that did not', () => {
		const before = fresh('a', 'b', 'c')
		const after = assignOrds(entries('a', 'c', 'b'), before)

		// `a` and `c` are still in order, so they keep what they had; `b` moved
		// past `c` and takes a new ord after it.
		expect(after[0].ord).toBe(1)
		expect(after[1].ord).toBe(3)
		expect(after[2].ord).toBeGreaterThan(3)
	})

	it('drops the ords of Blocks that are gone', () => {
		const rows = assignOrds(entries('a', 'c'), fresh('a', 'b', 'c'))
		expect(ords(rows)).toEqual({ a: 1, c: 3 })
	})

	it('always returns ords in ascending order', () => {
		const rows = assignOrds(entries('c', 'a', 'd', 'b'), fresh('a', 'b', 'c'))
		const values = rows.map((row) => row.ord)

		expect(values).toEqual([...values].sort((x, y) => x - y))
		expect(new Set(values).size).toBe(values.length)
	})
})
