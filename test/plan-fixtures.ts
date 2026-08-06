import type { OutlineNode, Plan, Reference } from '../src/plan'
import { emptyPlan } from '../src/plan'

/** A Plan with the fields a test does not care about already filled in. */
export function makePlan(overrides: Partial<Plan> = {}): Plan {
	return { ...emptyPlan('The article'), ...overrides }
}

/** An Outline node. `children` is always present, so a test states only the
 * fields it is about. */
export function makeNode(node: Partial<OutlineNode> & { id: string }): OutlineNode {
	return { title: `Node ${node.id}`, children: [], ...node }
}

/** A Reference the writer wrote themselves, unplaced. */
export function makeReference(reference: Partial<Reference> & { id: string }): Reference {
	return {
		provenance: { kind: 'writer' },
		text: 'A passage worth keeping.',
		nodeId: null,
		...reference,
	}
}
