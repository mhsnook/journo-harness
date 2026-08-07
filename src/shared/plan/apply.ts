import type { z } from 'zod'

import type { Anchor, OpName, ProposalOp } from './ops'
import { proposalSchema } from './ops'
import type { OutlineNode, Plan } from './schema'
import { planSchema } from './schema'

/**
 * The client-side applier, working on a copy so that the first op to refuse
 * throws the whole Proposal away. What the ops mean is `docs/architecture.md`
 * §6, and the vocabulary is ops.ts.
 */

/**
 * - `malformed` — the ops do not match the vocabulary in ops.ts.
 * - `missing` — an op names a node, a Reference, or an anchor the Plan does not
 *   carry.
 * - `stale` — an `expected` names a value the Plan no longer carries.
 * - `invalid` — the ops resolve, but applying them would leave something that is
 *   not a Plan.
 */
export type RefusalKind = 'malformed' | 'missing' | 'stale' | 'invalid'

export type Refusal = {
	kind: RefusalKind
	/** Which op refused, counting from 0, and null when the refusal is about the
	 * Proposal as a whole. */
	index: number | null
	/** Which op refused, and null when the malformed payload is what hid it. */
	op: OpName | null
	/** One sentence, written for the writer to read. */
	message: string
	/** The value the op named against the value the Plan carries. Both are
	 * present on a stale field and absent otherwise. */
	expected?: unknown
	found?: unknown
}

export type ApplyResult = { ok: true; plan: Plan } | { ok: false; refusal: Refusal }

/**
 * Apply a Proposal to a Plan, leaving the Plan passed in untouched. The Proposal
 * arrives from a tool call, so this parses it rather than trusting its type.
 */
export function applyProposal(plan: Plan, proposal: unknown): ApplyResult {
	const parsed = proposalSchema.safeParse(proposal)
	if (!parsed.success) return { ok: false, refusal: malformed(parsed.error) }

	const next = structuredClone(plan)

	for (const [index, op] of parsed.data.entries()) {
		const refusal = applyOp(next, op, index)
		if (refusal !== null) return { ok: false, refusal }
	}

	const checked = planSchema.safeParse(next)
	if (!checked.success) return { ok: false, refusal: invalidPlan(checked.error) }

	return { ok: true, plan: checked.data }
}

function applyOp(plan: Plan, op: ProposalOp, index: number): Refusal | null {
	const refuse = (kind: RefusalKind, message: string): Refusal => ({
		kind,
		index,
		op: op.op,
		message,
	})

	const stale = (where: string, expected: unknown, found: unknown): Refusal => ({
		...refuse(
			'stale',
			`${op.op} on ${where} expected ${JSON.stringify(expected)} and the Plan carries ${JSON.stringify(found)}.`,
		),
		expected,
		found,
	})

	const absent = (what: string) =>
		refuse('missing', `${op.op} names ${what}, which the Plan does not carry.`)

	switch (op.op) {
		case 'createNode': {
			const siblings = childrenOf(plan, op.parentId)
			if (siblings === null) return absent(`parent ${op.parentId}`)

			const at = insertionIndex(siblings, op)
			if (at === null) return refuse('missing', anchorMissing(op))

			// checkIds catches a repeated id at the final parse, but that refusal
			// cannot say which op carried it. Claiming them here is what does.
			const taken = new Set(plan.outline.flatMap(subtreeIds))
			for (const id of subtreeIds(op.node)) {
				if (taken.has(id)) {
					return refuse(
						'invalid',
						`${op.op} would leave two Outline nodes carrying the id ${id}.`,
					)
				}
				taken.add(id)
			}

			dropEmptyAdjectives(op.node)
			siblings.splice(at, 0, op.node)
			return null
		}

		case 'moveNode': {
			const site = locate(plan.outline, op.nodeId)
			if (site === null) return absent(`node ${op.nodeId}`)

			const node = site.siblings[site.index]
			if (op.parentId !== null && subtreeIds(node).includes(op.parentId)) {
				return refuse(
					'invalid',
					`${op.op} would move ${op.nodeId} under a node it contains.`,
				)
			}
			// Caught here rather than as a missing anchor, which is what it becomes
			// once the node is out of the Outline, and which would say the Plan does
			// not carry a node it does.
			if (op.afterId === op.nodeId || op.beforeId === op.nodeId) {
				return refuse('invalid', `${op.op} cannot anchor ${op.nodeId} to itself.`)
			}

			// The node comes out before the destination is known good. That is safe
			// only because a refusal discards this whole copy: a dry run, or applying
			// an op in place, would need every check above the splice.
			site.siblings.splice(site.index, 1)

			const siblings = childrenOf(plan, op.parentId)
			if (siblings === null) return absent(`parent ${op.parentId}`)

			const at = insertionIndex(siblings, op)
			if (at === null) return refuse('missing', anchorMissing(op))

			siblings.splice(at, 0, node)
			return null
		}

		case 'mergeNodes': {
			if (op.nodeId === op.intoId) {
				return refuse('invalid', `${op.op} names ${op.nodeId} on both sides.`)
			}

			const site = locate(plan.outline, op.nodeId)
			if (site === null) return absent(`node ${op.nodeId}`)
			const intoSite = locate(plan.outline, op.intoId)
			if (intoSite === null) return absent(`node ${op.intoId}`)

			const node = site.siblings[site.index]
			const into = intoSite.siblings[intoSite.index]
			if (subtreeIds(node).includes(op.intoId)) {
				return refuse(
					'invalid',
					`${op.op} would merge ${op.nodeId} into ${op.intoId}, which it contains.`,
				)
			}

			site.siblings.splice(site.index, 1)
			into.children.push(...node.children)
			for (const reference of plan.references) {
				if (reference.nodeId === op.nodeId) reference.nodeId = op.intoId
			}
			return null
		}

		case 'deleteNode': {
			const site = locate(plan.outline, op.nodeId)
			if (site === null) return absent(`node ${op.nodeId}`)

			// The unplacing lands in this op or nowhere: the Plan is written whole,
			// and a Reference naming a node that is gone does not parse — §4.
			const gone = new Set(subtreeIds(site.siblings[site.index]))
			site.siblings.splice(site.index, 1)
			for (const reference of plan.references) {
				if (reference.nodeId !== null && gone.has(reference.nodeId))
					reference.nodeId = null
			}
			return null
		}

		case 'setTitle': {
			const scope = scopeOf(plan, op.nodeId)
			if (scope === null) return absent(`node ${op.nodeId}`)

			if (!matches(op.expected, scope.title))
				return stale(scopeName(op.nodeId), op.expected, scope.title)

			scope.title = op.value
			return null
		}

		case 'setIntent': {
			const node = findNode(plan, op.nodeId)
			if (node === null) return absent(`node ${op.nodeId}`)

			const found = node.intent ?? null
			if (!matches(op.expected, found))
				return stale(scopeName(op.nodeId), op.expected, found)

			if (op.value === null) delete node.intent
			else node.intent = op.value
			return null
		}

		case 'setTarget': {
			// This op and setAdjectives cannot reach both Scopes through scopeOf the
			// way setTitle and setVoice do: the Article spells its target
			// `totalTarget`, and its Adjectives are required where a node's are not.
			if (op.nodeId === null) {
				if (!matches(op.expected, plan.totalTarget)) {
					return stale(scopeName(null), op.expected, plan.totalTarget)
				}
				plan.totalTarget = op.value
				return null
			}

			const node = findNode(plan, op.nodeId)
			if (node === null) return absent(`node ${op.nodeId}`)

			const found = node.target ?? null
			if (!matches(op.expected, found))
				return stale(scopeName(op.nodeId), op.expected, found)

			if (op.value === null) delete node.target
			else node.target = op.value
			return null
		}

		case 'setVoice': {
			const scope = scopeOf(plan, op.nodeId)
			if (scope === null) return absent(`node ${op.nodeId}`)

			const found = scope.voice ?? null
			if (!matches(op.expected, found))
				return stale(scopeName(op.nodeId), op.expected, found)

			if (op.value === null) delete scope.voice
			else scope.voice = op.value
			return null
		}

		case 'setAdjectives': {
			if (op.nodeId === null) {
				if (!matches(op.expected, plan.adjectives)) {
					return stale(scopeName(null), op.expected, plan.adjectives)
				}
				plan.adjectives = op.value
				return null
			}

			const node = findNode(plan, op.nodeId)
			if (node === null) return absent(`node ${op.nodeId}`)

			const found = node.adjectives ?? []
			if (!matches(op.expected, found))
				return stale(scopeName(op.nodeId), op.expected, found)

			if (op.value.length === 0) delete node.adjectives
			else node.adjectives = op.value
			return null
		}

		case 'placeReference': {
			const reference = plan.references.find((held) => held.id === op.referenceId)
			if (reference === undefined) return absent(`Reference ${op.referenceId}`)

			if (!matches(op.expected, reference.nodeId)) {
				return stale(`Reference ${op.referenceId}`, op.expected, reference.nodeId)
			}
			if (op.value !== null && findNode(plan, op.value) === null)
				return absent(`node ${op.value}`)

			reference.nodeId = op.value
			return null
		}
	}
}

/** Splicing needs the array holding a node, which `findNodePath` in scope.ts
 * does not return. */
type Site = { siblings: OutlineNode[]; index: number }

function locate(nodes: OutlineNode[], id: string): Site | null {
	const index = nodes.findIndex((node) => node.id === id)
	if (index !== -1) return { siblings: nodes, index }

	for (const node of nodes) {
		const deeper = locate(node.children, id)
		if (deeper !== null) return deeper
	}

	return null
}

function findNode(plan: Plan, id: string): OutlineNode | null {
	const site = locate(plan.outline, id)
	return site === null ? null : site.siblings[site.index]
}

/** What a content op with `nodeId: null` acts on. */
function scopeOf(plan: Plan, nodeId: string | null): Plan | OutlineNode | null {
	return nodeId === null ? plan : findNode(plan, nodeId)
}

function childrenOf(plan: Plan, parentId: string | null): OutlineNode[] | null {
	if (parentId === null) return plan.outline

	const parent = findNode(plan, parentId)
	return parent === null ? null : parent.children
}

/** Where the anchor puts the node among `siblings`, or null when the sibling it
 * names is gone. A null anchor names none, so it never goes missing. */
function insertionIndex(siblings: OutlineNode[], anchor: Anchor): number | null {
	if (anchor.afterId !== undefined) {
		if (anchor.afterId === null) return 0

		const at = siblings.findIndex((node) => node.id === anchor.afterId)
		return at === -1 ? null : at + 1
	}

	if (anchor.beforeId === null) return siblings.length

	const at = siblings.findIndex((node) => node.id === anchor.beforeId)
	return at === -1 ? null : at
}

function subtreeIds(node: Pick<OutlineNode, 'id' | 'children'>): string[] {
	return [node.id, ...node.children.flatMap(subtreeIds)]
}

/** The payload of a createNode op may state an empty Adjectives list where the
 * Plan says absent — §4. */
function dropEmptyAdjectives(node: OutlineNode) {
	if (node.adjectives?.length === 0) delete node.adjectives
	node.children.forEach(dropEmptyAdjectives)
}

/** Whole-field comparison. Adjectives are the one list a content op sets, and
 * order counts there. */
function matches(expected: unknown, found: unknown): boolean {
	if (Array.isArray(expected) && Array.isArray(found)) {
		return (
			expected.length === found.length && expected.every((term, at) => term === found[at])
		)
	}

	return expected === found
}

function scopeName(nodeId: string | null): string {
	return nodeId === null ? 'the Article' : `node ${nodeId}`
}

function anchorMissing(op: Anchor & { op: OpName; parentId: string | null }): string {
	const anchor =
		op.afterId !== undefined ? `after ${op.afterId}` : `before ${op.beforeId}`
	const holder = op.parentId === null ? 'the Outline' : `node ${op.parentId}`

	return `${op.op} anchors ${anchor}, which ${holder} does not carry.`
}

function malformed(error: z.ZodError): Refusal {
	const issue = error.issues[0]
	// A Proposal is a bare array of ops, so the first path segment is the op's
	// position. Wrapping the array in ops.ts would silently make this null.
	const index = typeof issue.path[0] === 'number' ? issue.path[0] : null

	return {
		kind: 'malformed',
		index,
		op: null,
		message: `An op does not match the vocabulary${at(issue.path.slice(1))}: ${issue.message}`,
	}
}

function invalidPlan(error: z.ZodError): Refusal {
	const issue = error.issues[0]

	return {
		kind: 'invalid',
		index: null,
		op: null,
		message: `The Proposal would leave a Plan the schema refuses${at(issue.path)}: ${issue.message}`,
	}
}

function at(path: PropertyKey[]): string {
	return path.length === 0 ? '' : ` at ${path.join('.')}`
}
