import type { OutlineNode } from './schema'

/**
 * Reading the Outline in the order it is written. Sibling order is array
 * position and nothing else is stored, so the number the writer sees is
 * positional and is worked out here rather than at each Panel — the Offer
 * ledger and the Plan Panel have to name one Section the same way.
 */

export type OutlineEntry = {
	node: OutlineNode
	/** 0 is a Section and 1 is a Subsection — context.md, **Node**. */
	depth: number
	/** What the writer reads: "§2", and "§2.1" for a Subsection. */
	label: string
}

/** Every node, outermost first and each one before its children. */
export function outlineEntries(
	outline: readonly OutlineNode[],
	prefix: readonly number[] = [],
): OutlineEntry[] {
	return outline.flatMap((node, index) => {
		const numbering = [...prefix, index + 1]

		return [
			{ node, depth: prefix.length, label: `§${numbering.join('.')}` },
			...outlineEntries(node.children, numbering),
		]
	})
}
