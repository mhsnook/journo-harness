import type { z } from 'zod'

import type { Anchor, OpName, ProposalOp } from './ops'
import { proposalSchema } from './ops'
import type { OutlineNode, Plan } from './schema'
import { planSchema } from './schema'

/**
 * The client-side applier. A Proposal is a list of ops applied
 * **all-or-nothing**: the applier works on a copy, and the first op that refuses
 * throws the copy away, so the Plan the writer sees never holds half a Proposal.
 *
 * A refusal names which op failed and why, because the UI has to say why rather
 * than greying the Proposal out. Whole-field comparison is conservative on
 * purpose — a Proposal that rewords an intent note the writer has since edited
 * is refused rather than merged.
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
 * Apply a Proposal to a Plan. The Plan passed in is never touched: a success
 * carries a new Plan, and a refusal carries the reason.
 *
 * The Proposal arrives from a tool call, so this parses it rather than trusting
 * its type, and it parses the Plan it produces rather than trusting the ops —
 * `validateStateChange` in the Article Agent would reject a Plan that does not
 * parse, and a refusal here says why while a rejected write says nothing.
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
	const refuse = (
		kind: RefusalKind,
		message: string,
		values?: { expected: unknown; found: unknown },
	): Refusal => ({ kind, index, op: op.op, message, ...values })

	const stale = (where: string, expected: unknown, found: unknown) =>
		refuse(
			'stale',
			`${op.op} on ${where} expected ${show(expected)} and the Plan carries ${show(found)}.`,
			{ expected, found },
		)

	const absent = (what: string) =>
		refuse('missing', `${op.op} names ${what}, which the Plan does not carry.`)

	switch (op.op) {
		case 'createNode': {
			const siblings = childrenOf(plan, op.parentId)
			if (siblings === null) return absent(`parent ${op.parentId}`)

			const at = insertionIndex(siblings, op)
			if (at === null) {
				return refuse(
					'missing',
					`${op.op} ${anchorPhrase(op)}, which ${under(op.parentId)}.`,
				)
			}

			const added = subtreeIds(op.node)
			const taken = plan.outline.flatMap(subtreeIds)
			const clash = added.find((id) => taken.includes(id))
			if (clash !== undefined) {
				return refuse(
					'invalid',
					`${op.op} carries the id ${clash}, which an Outline node already carries.`,
				)
			}
			const twice = added.find((id, position) => added.indexOf(id) !== position)
			if (twice !== undefined) {
				return refuse('invalid', `${op.op} carries the id ${twice} twice.`)
			}

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
					`${op.op} would move ${op.nodeId} inside its own subtree.`,
				)
			}

			site.siblings.splice(site.index, 1)

			const siblings = childrenOf(plan, op.parentId)
			if (siblings === null) return absent(`parent ${op.parentId}`)

			const at = insertionIndex(siblings, op)
			if (at === null) {
				return refuse(
					'missing',
					`${op.op} ${anchorPhrase(op)}, which ${under(op.parentId)}.`,
				)
			}

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

			const gone = subtreeIds(site.siblings[site.index])
			site.siblings.splice(site.index, 1)
			for (const reference of plan.references) {
				if (reference.nodeId !== null && gone.includes(reference.nodeId))
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

			// A node stating no Adjectives and one stating an empty list are the
			// same node, so both read as the empty list here.
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

/** Where a node sits: the array holding it, and its position in that array. The
 * applier splices, so it needs the array rather than the node alone. */
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

/** What a content op with `nodeId: null` acts on. The Article and an Outline
 * node carry the same Scope fields, which is why one op serves both. */
function scopeOf(plan: Plan, nodeId: string | null): Plan | OutlineNode | null {
	return nodeId === null ? plan : findNode(plan, nodeId)
}

function childrenOf(plan: Plan, parentId: string | null): OutlineNode[] | null {
	if (parentId === null) return plan.outline

	const parent = findNode(plan, parentId)
	return parent === null ? null : parent.children
}

/** Where the anchor puts the node among `siblings`, or null when the sibling it
 * names is gone. A null anchor names no sibling, so it never goes missing. */
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

/** Every id in a subtree, the node's own first. */
function subtreeIds(node: Pick<OutlineNode, 'id' | 'children'>): string[] {
	return [node.id, ...node.children.flatMap(subtreeIds)]
}

/** Whole-field comparison. Adjectives are the one list a content op sets, and
 * two lists match when they carry the same terms in the same order. */
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

function anchorPhrase(anchor: Anchor): string {
	return anchor.afterId !== undefined
		? `anchors after ${anchor.afterId}`
		: `anchors before ${anchor.beforeId}`
}

function under(parentId: string | null): string {
	return parentId === null
		? 'the Outline does not carry'
		: `node ${parentId} does not carry`
}

function show(value: unknown): string {
	return JSON.stringify(value)
}

function malformed(error: z.ZodError): Refusal {
	const issue = error.issues[0]
	const index = typeof issue.path[0] === 'number' ? issue.path[0] : null
	const field = issue.path.slice(1).join('.')

	return {
		kind: 'malformed',
		index,
		op: null,
		message:
			field === ''
				? `An op does not match the vocabulary: ${issue.message}`
				: `An op does not match the vocabulary at ${field}: ${issue.message}`,
	}
}

function invalidPlan(error: z.ZodError): Refusal {
	const issue = error.issues[0]
	const at = issue.path.join('.')

	return {
		kind: 'invalid',
		index: null,
		op: null,
		message:
			at === ''
				? `The Proposal would leave a Plan the schema refuses: ${issue.message}`
				: `The Proposal would leave a Plan the schema refuses at ${at}: ${issue.message}`,
	}
}
