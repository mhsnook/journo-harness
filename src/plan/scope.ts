import type { OutlineNode, Plan } from './schema'

/**
 * Scope resolution, at read time and never stored resolved. A Voice replaces
 * and Adjectives compose, running House, then Article, then Outline node,
 * nearest last. A node's ancestors take part in that same order, so a
 * subsection under a somber middle is somber unless it says otherwise.
 *
 * The House terms default to empty, so 1b passes a value rather than changing
 * these signatures.
 */

/** What one Scope states. Every level has the same two fields. */
export type ScopeTerms = {
	voice?: string
	adjectives?: string[]
}

/** What applies at a point in the Plan. The Voice is null when no Scope states
 * one, and the Adjectives run House first and nearest last. */
export type ResolvedScope = {
	voice: string | null
	adjectives: string[]
}

/** Resolve a chain of Scopes given widest first. The last Voice wins outright;
 * the Adjectives accumulate in order, and a term repeated at two Scopes appears
 * once, at the widest Scope that states it. */
export function resolveScope(chain: readonly ScopeTerms[]): ResolvedScope {
	let voice: string | null = null
	const adjectives: string[] = []

	for (const terms of chain) {
		if (terms.voice !== undefined) voice = terms.voice
		for (const adjective of terms.adjectives ?? []) {
			if (!adjectives.includes(adjective)) adjectives.push(adjective)
		}
	}

	return { voice, adjectives }
}

/** What applies to the Article as a whole: House, then the Plan's own terms. */
export function resolveArticleScope(plan: Plan, house: ScopeTerms = {}): ResolvedScope {
	return resolveScope([house, plan])
}

/** What applies at one Outline node: House, the Article, then every ancestor
 * from the outermost down to the node itself. Returns null when the Plan
 * carries no node with that id. */
export function resolveNodeScope(
	plan: Plan,
	nodeId: string,
	house: ScopeTerms = {},
): ResolvedScope | null {
	const path = findNodePath(plan.outline, nodeId)
	if (path === null) return null

	return resolveScope([house, plan, ...path])
}

/** The chain of Outline nodes from the outermost down to `nodeId`, or null when
 * no node carries that id. The node itself is the last element. */
export function findNodePath(
	outline: readonly OutlineNode[],
	nodeId: string,
): OutlineNode[] | null {
	for (const node of outline) {
		if (node.id === nodeId) return [node]

		const deeper = findNodePath(node.children, nodeId)
		if (deeper !== null) return [node, ...deeper]
	}

	return null
}

/** The node with that id, or null. */
export function findNode(
	outline: readonly OutlineNode[],
	nodeId: string,
): OutlineNode | null {
	return findNodePath(outline, nodeId)?.at(-1) ?? null
}
