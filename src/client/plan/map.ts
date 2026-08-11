import type { OutlineNode, Plan, Reference } from '../../shared/plan'
import { referenceEntries, referenceName } from './references'

/**
 * The geometry behind the Map View — where each box sits when the Plan opens
 * left to right, and the curve that joins it to its parent.
 *
 * Arithmetic only, so `test/client/plan-map.test.ts` drives it with a Plan and
 * reads the numbers back. `PlanMap.tsx` draws what this returns and computes
 * none of it, so what a test measures and what the writer sees cannot drift
 * apart.
 *
 * **Two shapes, and `branches` picks one.** `references` is the Plan v1 has:
 * the Article title, one layer of Sections, and the References placed at each.
 * `sections` branches the Sections nested inside a Section off it instead,
 * however deep the Plan goes — which the schema allows and the interface does
 * not offer, so it is an idea rather than a screen. `context.md` §Subsection
 * says why.
 */

/** What one box stands for. The three are drawn alike and read differently. */
export type MapSubject =
	| { kind: 'article' }
	| { kind: 'section'; node: OutlineNode }
	| { kind: 'reference'; reference: Reference; number: number }

/** One box on the map. */
export interface MapNode {
	/** The map's own identity. `root`, `n:` and a Section's id, or `r:` and a
	 * Reference's id — so ids that collide across the two lists cannot. */
	key: string
	/** The key of the box this one hangs off, and null at the root. */
	parentKey: string | null
	subject: MapSubject
	/** What the box reads. Empty where the writer has typed no title yet. */
	title: string
	/** "2" for a Section, "2.1" for a nested one, "[3]" for a Reference, and
	 * empty at the root. */
	ordinal: string
	/** 0 is the Article title, 1 is a Section, and 2 is whatever hangs off one. */
	depth: number
	x: number
	y: number
	width: number
	height: number
	/** How many children the box holds, drawn or not. */
	childCount: number
	/** The References placed at this Section, by their number in the Plan's
	 * list. Empty under `branches: 'references'`, where each is its own box. */
	referenceNumbers: number[]
	/** True where the box holds children this map is not drawing. */
	collapsed: boolean
	/** Every key from the parent up to the root, nearest first. Hovering a box
	 * lights this path, so the component walks nothing to find it. */
	ancestors: string[]
}

/** One curve, joining a parent's right edge to a child's left edge. */
export interface MapLink {
	parentKey: string
	childKey: string
	/** The `d` of the SVG path. */
	d: string
}

export interface PlanMap {
	nodes: MapNode[]
	links: MapLink[]
	/** What the SVG viewBox needs, in the same units the nodes carry. */
	width: number
	height: number
}

/** What branches off a Section. */
export type MapBranches = 'references' | 'sections'

export interface MapOptions {
	nodeWidth?: number
	/** The gap between one column and the next. */
	columnGap?: number
	/** The gap between two boxes in the same column. */
	rowGap?: number
	/**
	 * How tall one box is. A function rather than a number, because what a box
	 * carries decides how many lines it needs — which is the case a fixed-size
	 * tree layout cannot express.
	 */
	heightOf?: (box: Measured) => number
	/** Sections whose children the map is leaving undrawn. */
	collapsed?: ReadonlySet<string>
	/** What branches off a Section. `references` by default, which is the Plan
	 * the interface offers. */
	branches?: MapBranches
}

/** What the height of a box is decided from. */
export type Measured = Pick<MapNode, 'subject' | 'depth' | 'referenceNumbers'>

/**
 * Room for the ordinal and a two-line title, plus a line for each of the two
 * things a Section can carry underneath: its intent note, and the References
 * placed at it. A title runs to two lines often enough at this width that the
 * shorter box is not worth the clipping.
 */
function defaultHeight({ subject, referenceNumbers }: Measured): number {
	if (subject.kind === 'article') return 48
	// A Reference reads as its mark and its name, and carries nothing below.
	if (subject.kind === 'reference') return 44

	return (
		48 +
		(subject.node.intent === undefined ? 0 : 18) +
		(referenceNumbers.length === 0 ? 0 : 16)
	)
}

/** The curve between two boxes: out of the parent's right edge, into the
 * child's left edge, turning at the midpoint between the two columns. This is
 * the cubic d3-shape's `curveBumpX` generates, written out. */
export function linkPath(parent: MapNode, child: MapNode): string {
	const sx = parent.x + parent.width
	const sy = parent.y + parent.height / 2
	const tx = child.x
	const ty = child.y + child.height / 2
	const mx = (sx + tx) / 2

	return `M${sx},${sy}C${mx},${sy} ${mx},${ty} ${tx},${ty}`
}

/** The Plan's id for what a box stands for, and null at the root. */
export function subjectId(subject: MapSubject): string | null {
	if (subject.kind === 'article') return null

	return subject.kind === 'section' ? subject.node.id : subject.reference.id
}

/**
 * Lays the Plan out left to right and returns every box and every curve.
 *
 * Leaves stack down the page in reading order, and a parent centres on the
 * children it holds. Where centring would ride a parent up into the box above
 * it in its own column, the parent takes the floor instead and its whole
 * subtree moves down with it, so the subtree keeps its shape.
 */
export function planMap(plan: Plan, options: MapOptions = {}): PlanMap {
	const {
		nodeWidth = 210,
		columnGap = 40,
		rowGap = 10,
		heightOf = defaultHeight,
		collapsed = new Set<string>(),
		branches = 'references',
	} = options

	const nodes: MapNode[] = []

	// Numbered once, off the one list, so a box and `references.ts` cannot mark
	// the same Reference two different ways.
	const placed = new Map<string, { reference: Reference; number: number }[]>()
	for (const entry of referenceEntries(plan)) {
		const nodeId = entry.reference.nodeId
		if (nodeId === null) continue
		placed.set(nodeId, [...(placed.get(nodeId) ?? []), entry])
	}

	// Where the next leaf goes, counting down the page in reading order.
	let cursor = 0
	// The bottom edge each column has reached, so a parent centred on a short
	// subtree cannot ride up into the box above it.
	const floors: number[] = []

	/** What branches off this box, as the subjects those boxes stand for. */
	const childrenOf = (subject: MapSubject): MapSubject[] => {
		if (subject.kind === 'reference') return []
		if (subject.kind === 'article') {
			return plan.outline.map((node) => ({ kind: 'section', node }) as const)
		}

		if (branches === 'sections') {
			return subject.node.children.map((node) => ({ kind: 'section', node }) as const)
		}

		return (placed.get(subject.node.id) ?? []).map(
			(entry) => ({ kind: 'reference', ...entry }) as const,
		)
	}

	const place = (
		subject: MapSubject,
		depth: number,
		ordinal: string,
		parentKey: string | null,
		ancestors: string[],
	): MapNode => {
		const id = subjectId(subject)
		const key =
			subject.kind === 'article'
				? 'root'
				: `${subject.kind === 'section' ? 'n' : 'r'}:${id}`

		// A Section reads its own placed References only where they are not boxes
		// of their own — otherwise the map would say it twice.
		const referenceNumbers =
			subject.kind === 'section' && branches === 'sections'
				? (placed.get(subject.node.id) ?? []).map((entry) => entry.number)
				: []

		const held = childrenOf(subject)
		const isCollapsed = id !== null && collapsed.has(id)
		const height = heightOf({ subject, depth, referenceNumbers })

		const entry: MapNode = {
			key,
			parentKey,
			subject,
			title: titleOf(subject, plan),
			ordinal,
			depth,
			x: depth * (nodeWidth + columnGap),
			y: 0,
			width: nodeWidth,
			height,
			childCount: held.length,
			referenceNumbers,
			collapsed: isCollapsed,
			ancestors,
		}

		// Pushed before the children, so a subtree occupies one run of the array
		// and shifting it is a slice rather than a second walk.
		const start = nodes.length
		nodes.push(entry)

		const drawn = isCollapsed ? [] : held
		const laid = drawn.map((child, index) =>
			place(child, depth + 1, childOrdinal(child, ordinal, index), key, [
				key,
				...ancestors,
			]),
		)

		const floor = floors[depth] ?? 0

		if (laid.length === 0) {
			entry.y = Math.max(cursor, floor)
		} else {
			const first = laid[0]!
			const last = laid[laid.length - 1]!
			entry.y = (first.y + last.y + last.height - height) / 2

			if (entry.y < floor) {
				const by = floor - entry.y
				entry.y = floor
				for (let i = start + 1; i < nodes.length; i += 1) nodes[i]!.y += by
				cursor += by
			}
		}

		cursor = Math.max(cursor, entry.y + height + rowGap)
		floors[depth] = entry.y + height + rowGap

		return entry
	}

	place({ kind: 'article' }, 0, '', null, [])

	const byKey = new Map(nodes.map((entry) => [entry.key, entry]))
	const links: MapLink[] = []

	for (const child of nodes) {
		if (child.parentKey === null) continue
		const parent = byKey.get(child.parentKey)
		if (parent === undefined) continue

		links.push({ parentKey: parent.key, childKey: child.key, d: linkPath(parent, child) })
	}

	const width = Math.max(...nodes.map((entry) => entry.x + entry.width))
	const height = Math.max(...nodes.map((entry) => entry.y + entry.height))

	return { nodes, links, width, height }
}

/** A Reference keeps the number it has in the Plan's list, the way a footnote
 * does. A Section is numbered by where it sits. */
function childOrdinal(subject: MapSubject, parentOrdinal: string, index: number): string {
	if (subject.kind === 'reference') return `[${subject.number}]`

	return parentOrdinal === '' ? `${index + 1}` : `${parentOrdinal}.${index + 1}`
}

/** A Reference is named the way every other surface names it, so the map and
 * the References list cannot call one item two things. */
function titleOf(subject: MapSubject, plan: Plan): string {
	if (subject.kind === 'article') return plan.title
	if (subject.kind === 'section') return subject.node.title

	return referenceName(subject.reference)
}
