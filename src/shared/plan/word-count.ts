import type { OutlineNode, Plan } from './schema'

/**
 * Word-count arithmetic. The total is stored and nothing derives it, so the
 * parts are allowed to disagree with the whole and the gap is information.
 */

/**
 * - `unstated` — no total is stated, so there is nothing to compare against.
 * - `balanced` — the targets meet the total exactly.
 * - `unallocated` — the targets fall short and some node carries no target.
 * - `under` — the targets fall short and every node carries one.
 * - `over` — the targets exceed the total.
 */
export type AllocationStatus = 'unstated' | 'balanced' | 'unallocated' | 'under' | 'over'

export type Allocation = {
	/** The stored target: the Article's `totalTarget`, or the node's `target`. */
	total: number | null
	/** The sum of the targets below it. */
	allocated: number
	/** How many nodes below it supplied a target to that sum. */
	targeted: number
	/** How many nodes below it carry no target and no children to carry one. */
	untargeted: number
	/** `total - allocated`, and null when no total is stated. Positive is words
	 * still to place; negative is words over. */
	gap: number | null
	status: AllocationStatus
}

/** The Article's total against the targets in its Outline. */
export function planAllocation(plan: Plan): Allocation {
	return allocate(plan.totalTarget, plan.outline)
}

/** One node's target against the targets of its children. A leaf node has
 * nothing below it, so its whole target reads as unallocated — ask this where
 * children exist. */
export function nodeAllocation(node: OutlineNode): Allocation {
	return allocate(node.target ?? null, node.children)
}

function allocate(total: number | null, nodes: readonly OutlineNode[]): Allocation {
	const { allocated, targeted, untargeted } = sumTargets(nodes)

	if (total === null) {
		return {
			total: null,
			allocated,
			targeted,
			untargeted,
			gap: null,
			status: 'unstated',
		}
	}

	const gap = total - allocated
	return {
		total,
		allocated,
		targeted,
		untargeted,
		gap,
		status: statusFor(gap, untargeted, nodes),
	}
}

function statusFor(
	gap: number,
	untargeted: number,
	nodes: readonly OutlineNode[],
): AllocationStatus {
	if (gap === 0) return 'balanced'
	if (gap < 0) return 'over'

	// Nothing below yet is the same reading as some node carrying no target:
	// the words are not placed, rather than deliberately short of the total.
	return untargeted > 0 || nodes.length === 0 ? 'unallocated' : 'under'
}

/**
 * A node's target covers its subtree, so the walk stops at the outermost node
 * carrying one — counting a parent and its children both would double the same
 * words. `untargeted` counts the leaves the walk reaches without meeting a
 * target, which is what separates "not allocated yet" from "deliberately under".
 *
 * `targeted` counts the nodes the walk stopped at. The two together are the
 * nodes the writer can state a target on, which is what "6 of 8" counts.
 */
function sumTargets(nodes: readonly OutlineNode[]): {
	allocated: number
	targeted: number
	untargeted: number
} {
	let allocated = 0
	let targeted = 0
	let untargeted = 0

	for (const node of nodes) {
		if (node.target !== undefined) {
			allocated += node.target
			targeted += 1
			continue
		}
		if (node.children.length === 0) {
			untargeted += 1
			continue
		}

		const below = sumTargets(node.children)
		allocated += below.allocated
		targeted += below.targeted
		untargeted += below.untargeted
	}

	return { allocated, targeted, untargeted }
}
