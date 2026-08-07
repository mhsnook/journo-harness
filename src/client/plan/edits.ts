import type { Anchor, OutlineNode, Plan, ProposalInput } from '../../shared/plan'
import { findNodePath } from '../../shared/plan'
import { placementOf } from './outline'

/**
 * The writer's edits, written in the op vocabulary the Chat proposes in and
 * applied by the same applier — docs/architecture.md §6. One path into the Plan
 * means the Panel cannot make a change the applier would refuse, and a
 * structural edit carries the consequences the ops already state: deleting a
 * Section unplaces the References placed at it.
 *
 * Every builder reads `expected` out of the Plan it is handed, so the writer's
 * own edits never go Stale. Staleness is the Chat's problem — it comes from the
 * gap between generating a Proposal and applying it, and there is no such gap
 * here.
 *
 * A builder returns null where the edit has nowhere to go: the first Section
 * cannot move up, and a Subsection cannot nest again. The Panel disables the
 * control rather than sending an op the applier would refuse.
 */

/** Which Scope a content op acts on. null is the Article — §6. */
export type Scope = string | null

/** Where a new Section goes: whose child it is, and which neighbour it anchors
 * to. `beforeId: null` is last child, and `afterId: null` is first. */
export type SectionAnchor = { parentId: string | null } & Anchor

export function setTitle(plan: Plan, scope: Scope, value: string): ProposalInput {
	const expected = scope === null ? plan.title : (nodeAt(plan, scope)?.title ?? '')

	return [{ op: 'setTitle', nodeId: scope, expected, value }]
}

/** The Article carries no intent note, so this one takes a Section. */
export function setIntent(
	plan: Plan,
	nodeId: string,
	value: string | null,
): ProposalInput {
	return [
		{ op: 'setIntent', nodeId, expected: nodeAt(plan, nodeId)?.intent ?? null, value },
	]
}

export function setTarget(plan: Plan, scope: Scope, value: number | null): ProposalInput {
	const expected =
		scope === null ? plan.totalTarget : (nodeAt(plan, scope)?.target ?? null)

	return [{ op: 'setTarget', nodeId: scope, expected, value }]
}

export function setVoice(plan: Plan, scope: Scope, value: string | null): ProposalInput {
	const expected =
		scope === null ? (plan.voice ?? null) : (nodeAt(plan, scope)?.voice ?? null)

	return [{ op: 'setVoice', nodeId: scope, expected, value }]
}

export function setAdjectives(plan: Plan, scope: Scope, value: string[]): ProposalInput {
	const expected =
		scope === null ? plan.adjectives : (nodeAt(plan, scope)?.adjectives ?? [])

	return [{ op: 'setAdjectives', nodeId: scope, expected, value }]
}

/** A new Section, empty and untitled. The id is made here because the Plan is
 * the only place ids live, and it never changes again. */
export function addSection(
	anchor: SectionAnchor,
	id: string = crypto.randomUUID(),
): ProposalInput {
	return [{ op: 'createNode', ...anchor, node: { id, title: '', children: [] } }]
}

export function deleteSection(nodeId: string): ProposalInput {
	return [{ op: 'deleteNode', nodeId }]
}

/**
 * Move a Section one place among its siblings. It anchors to the neighbour it
 * swaps with rather than to a position, which is the same anchoring the Chat's
 * Proposals use.
 */
export function moveSection(
	plan: Plan,
	nodeId: string,
	direction: 'up' | 'down',
): ProposalInput | null {
	const at = placementOf(plan, nodeId)
	if (at === null) return null

	const swapWith = direction === 'up' ? at.index - 1 : at.index + 1
	if (swapWith < 0 || swapWith >= at.siblings.length) return null

	const neighbour = at.siblings[swapWith].id
	const anchor: Anchor =
		direction === 'up' ? { beforeId: neighbour } : { afterId: neighbour }

	return [{ op: 'moveNode', nodeId, parentId: at.parentId, ...anchor }]
}

/**
 * Make a Section the last Subsection of the Section above it. Null where that
 * would go a level too deep: the interface offers two levels, and anything
 * deeper wants a word the writer already holds rather than a more recursive
 * one — context.md, **Subsection**.
 */
export function nestSection(plan: Plan, nodeId: string): ProposalInput | null {
	const at = placementOf(plan, nodeId)
	if (at === null || at.depth > 0 || at.index === 0) return null
	if (at.node.children.length > 0) return null

	return [
		{ op: 'moveNode', nodeId, parentId: at.siblings[at.index - 1].id, beforeId: null },
	]
}

/** Make a Subsection a Section again, directly after the one it sat in. */
export function liftSection(plan: Plan, nodeId: string): ProposalInput | null {
	const at = placementOf(plan, nodeId)
	if (at === null || at.parentId === null) return null

	const parent = placementOf(plan, at.parentId)
	if (parent === null) return null

	return [{ op: 'moveNode', nodeId, parentId: parent.parentId, afterId: at.parentId }]
}

/** Place a Reference at a Section, or nowhere with null. */
export function placeReference(
	plan: Plan,
	referenceId: string,
	nodeId: string | null,
): ProposalInput | null {
	const reference = plan.references.find((held) => held.id === referenceId)
	if (reference === undefined) return null

	return [
		{ op: 'placeReference', referenceId, expected: reference.nodeId, value: nodeId },
	]
}

function nodeAt(plan: Plan, nodeId: string): OutlineNode | null {
	const path = findNodePath(plan.outline, nodeId)

	return path === null ? null : path[path.length - 1]
}
