import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AllocationNote } from '../../src/client/plan/WordCount'
import { planAllocation } from '../../src/shared/plan'
import { makeNode, makePlan } from '../shared/plan-fixtures'

/**
 * The one line above the Outline that says how the word-count target is doing.
 * `plan-word-count.test.ts` holds the arithmetic; this holds what the writer
 * reads off it.
 */

function note(totalTarget: number, targets: (number | undefined)[]) {
	const outline = targets.map((target, index) =>
		makeNode({ id: `n${index}`, ...(target === undefined ? {} : { target }) }),
	)
	const allocation = planAllocation(makePlan({ totalTarget, outline }))

	return renderToStaticMarkup(createElement(AllocationNote, { allocation })).replace(
		/<[^>]*>/g,
		'',
	)
}

describe('what the allocation note says', () => {
	// "the Sections meet the total" said nothing about how many Sections carried
	// a target, so a writer who had left one blank had to go and count.
	it('counts the Sections that carry a target once the words add up', () => {
		expect(note(1000, [400, 600])).toBe('fully allocated across 2/2 Sections')
	})

	it('still counts the blank one, where the rest already meet the total', () => {
		expect(note(1000, [400, 600, undefined])).toBe('fully allocated across 2/3 Sections')
	})

	it('names the words left over while any Section carries no target', () => {
		expect(note(1000, [400, undefined])).toBe('600 words unallocated')
	})

	it('names the shortfall once every Section carries one', () => {
		expect(note(1200, [400, 600])).toBe('the Sections fall 200 words short')
	})

	it('names the overrun', () => {
		expect(note(800, [400, 600])).toBe('200 words over the total')
	})
})
