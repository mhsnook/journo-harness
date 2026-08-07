import { findNodePath, type OutlineNode, type Plan } from '../../shared/plan'

/**
 * Reading the Outline for the Panel. Depth picks the word the writer reads — 0
 * is a Section and 1 is a Subsection — so nothing here says "node" anywhere the
 * writer can see it.
 */

/** Where one Section sits in the Outline. */
export type Placement = {
	node: OutlineNode
	/** The Section holding this one, and null when it sits at the top level. */
	parentId: string | null
	/** The array holding it, which is what its order is. */
	siblings: readonly OutlineNode[]
	index: number
	/** 0 is a Section and 1 is a Subsection. */
	depth: number
}

export type OutlineEntry = Placement & {
	/** What the row is numbered: "2" for a Section, "2.1" for a Subsection. */
	ordinal: string
}

/** Where one Section sits, or null when the Plan carries none with that id. */
export function placementOf(plan: Plan, nodeId: string): Placement | null {
	const path = findNodePath(plan.outline, nodeId)
	if (path === null) return null

	const node = path[path.length - 1]
	const parent = path.length > 1 ? path[path.length - 2] : null
	const siblings = parent === null ? plan.outline : parent.children

	return {
		node,
		parentId: parent === null ? null : parent.id,
		siblings,
		index: siblings.indexOf(node),
		depth: path.length - 1,
	}
}

/**
 * Every Section and Subsection in reading order. The Panel renders one flat
 * list rather than a recursive one, so a row is one component and the depth is
 * a number it indents by.
 */
export function outlineEntries(outline: readonly OutlineNode[]): OutlineEntry[] {
	const entries: OutlineEntry[] = []

	const walk = (
		siblings: readonly OutlineNode[],
		parentId: string | null,
		depth: number,
		prefix: string,
	) => {
		siblings.forEach((node, index) => {
			const ordinal = `${prefix}${index + 1}`
			entries.push({ node, parentId, siblings, index, depth, ordinal })
			walk(node.children, node.id, depth + 1, `${ordinal}.`)
		})
	}
	walk(outline, null, 0, '')

	return entries
}

/**
 * What a Section is called where the number stands on its own — a heading, a
 * chip, a row in the Offer ledger. `ordinal` is the bare number, for a gutter
 * of them and for the phrases that compose one: "Section 2" reads as itself,
 * where "Section §2" does not.
 */
export function sectionLabel(entry: Pick<OutlineEntry, 'ordinal'>): string {
	return `§${entry.ordinal}`
}

/** What the writer calls a row at this depth. */
export function depthName(depth: number): string {
	return depth === 0 ? 'Section' : 'Subsection'
}
