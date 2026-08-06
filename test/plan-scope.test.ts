import { describe, expect, it } from 'vitest'

import type { ScopeTerms } from '../src/shared/plan'
import {
	findNode,
	resolveArticleScope,
	resolveNodeScope,
	resolveScope,
} from '../src/shared/plan'
import { makeNode, makePlan } from './plan-fixtures'

const house: ScopeTerms = {
	voice: 'clean and professional',
	adjectives: ['well researched'],
}

const plan = makePlan({
	voice: 'reported feature',
	adjectives: ['funny'],
	outline: [
		makeNode({
			id: 'n1',
			voice: 'academic',
			adjectives: ['somber'],
			children: [
				makeNode({ id: 'n1a', adjectives: ['high energy'] }),
				makeNode({ id: 'n1b', voice: 'plain' }),
			],
		}),
		makeNode({ id: 'n2' }),
	],
})

describe('the Scope resolver', () => {
	it('resolves nothing from a Plan that states nothing, with no House', () => {
		expect(resolveArticleScope(makePlan())).toEqual({ voice: null, adjectives: [] })
	})

	it('takes the House terms when the Article states none', () => {
		const bare = makePlan()

		expect(resolveArticleScope(bare, house)).toEqual({
			voice: 'clean and professional',
			adjectives: ['well researched'],
		})
	})

	it('replaces the House Voice with the Article Voice, and keeps both Adjectives', () => {
		expect(resolveArticleScope(plan, house)).toEqual({
			voice: 'reported feature',
			adjectives: ['well researched', 'funny'],
		})
	})

	it('lets the nearest Outline node win the Voice outright, across all three Scopes', () => {
		expect(resolveNodeScope(plan, 'n1', house)).toEqual({
			voice: 'academic',
			adjectives: ['well researched', 'funny', 'somber'],
		})
	})

	it('accumulates Adjectives through an ancestor node that states no Voice', () => {
		expect(resolveNodeScope(plan, 'n1a', house)).toEqual({
			voice: 'academic',
			adjectives: ['well researched', 'funny', 'somber', 'high energy'],
		})
	})

	it('lets a child replace its parent Voice while keeping the parent Adjective', () => {
		expect(resolveNodeScope(plan, 'n1b', house)).toEqual({
			voice: 'plain',
			adjectives: ['well researched', 'funny', 'somber'],
		})
	})

	it('gives a node that states nothing what the Article states', () => {
		expect(resolveNodeScope(plan, 'n2', house)).toEqual(resolveArticleScope(plan, house))
	})

	it('defaults the House to empty, so 1a passes nothing', () => {
		expect(resolveNodeScope(plan, 'n1a')).toEqual({
			voice: 'academic',
			adjectives: ['funny', 'somber', 'high energy'],
		})
	})

	it('returns null for a node the Plan does not carry', () => {
		expect(resolveNodeScope(plan, 'gone', house)).toBeNull()
	})

	it('states an Adjective repeated at two Scopes once, in the nearest position', () => {
		const resolved = resolveScope([
			{ adjectives: ['funny', 'well researched'] },
			{ adjectives: ['somber', 'funny'] },
		])

		expect(resolved.adjectives).toEqual(['well researched', 'somber', 'funny'])
	})

	it('reads a node restating a House Adjective as local emphasis', () => {
		const warm = makePlan({ outline: [makeNode({ id: 'n1', adjectives: ['warm'] })] })
		const resolved = resolveNodeScope(warm, 'n1', { adjectives: ['warm', 'plain'] })

		expect(resolved?.adjectives).toEqual(['plain', 'warm'])
	})

	it('resolves at read time and writes nothing back', () => {
		const before = structuredClone(plan)
		resolveNodeScope(plan, 'n1a', house)

		expect(plan).toEqual(before)
		expect(findNode(plan.outline, 'n1a')).toEqual({
			id: 'n1a',
			title: 'Node n1a',
			adjectives: ['high energy'],
			children: [],
		})
	})
})
