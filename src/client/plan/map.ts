import type { OutlineNode, Plan } from '../../shared/plan'

/**
 * The geometry behind the Map View — where each Section sits when the Outline
 * opens left to right, and the curve that joins it to its parent.
 *
 * Arithmetic only, so `test/client/plan-map.test.ts` drives it with a Plan and
 * reads the numbers back. `PlanMap.tsx` draws what this returns and computes
 * none of it, so nothing on screen can disagree with what the test measures.
 *
 * The tree it walks is the one `outline.ts` walks, and it numbers rows the same
 * way — "2" for a Section, "2.1" for a Subsection. The Article title is the
 * root, which is the node the writer sees on the left.
 */

/** One box on the map. */
export interface MapNode {
	/** The map's own identity. The root is `root` and a Section is `n:` and its
	 * id, so a Section whose id is literally "root" cannot collide with it. */
	key: string
	/** The key of the box this one hangs off, and null at the root. */
	parentKey: string | null
	/** The Plan's id for this Section, and null at the root. */
	nodeId: string | null
	/** Null at the root, which is the Article title rather than a Section. */
	node: OutlineNode | null
	/** What the box reads. Empty where the writer has typed no title yet. */
	title: string
	/** "2" for a Section, "2.1" for a Subsection, and empty at the root. */
	ordinal: string
	/** 0 is the Article title, 1 is a Section, 2 is a Subsection. */
	depth: number
	x: number
	y: number
	width: number
	height: number
	/** How many children the node holds, drawn or not. */
	childCount: number
	/** The References placed here, by their position in the Plan's list — the
	 * numbers `references.ts` marks them with. Empty at the root, which holds
	 * none: a Reference is placed at a Section or at nothing. */
	referenceNumbers: number[]
	/** True where the node holds children this map is not drawing. */
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

export interface MapOptions {
	nodeWidth?: number
	/** The gap between one column and the next. */
	columnGap?: number
	/** The gap between two boxes in the same column. */
	rowGap?: number
	/**
	 * How tall one box is. A function rather than a number, because what a
	 * Section carries decides how many lines it needs — which is the case a
	 * fixed-size tree layout cannot express.
	 */
	heightOf?: (node: OutlineNode | null, depth: number, referenceCount: number) => number
	/** Sections whose children the map is leaving undrawn. */
	collapsed?: ReadonlySet<string>
}

/**
 * Room for the ordinal and a two-line title, plus a line for each of the two
 * things a Section can carry underneath: its intent note, and the References
 * placed at it. A title runs to two lines often enough at this width that the
 * shorter box is not worth the clipping.
 */
function defaultHeight(
	node: OutlineNode | null,
	_depth: number,
	referenceCount: number,
): number {
	if (node === null) return 48

	return 48 + (node.intent === undefined ? 0 : 18) + (referenceCount === 0 ? 0 : 16)
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
	} = options

	const nodes: MapNode[] = []

	// Numbered once, off the one list, so the box and `references.ts` cannot
	// mark the same Reference two different ways.
	const placed = new Map<string, number[]>()
	plan.references.forEach((reference, index) => {
		if (reference.nodeId === null) return
		placed.set(reference.nodeId, [...(placed.get(reference.nodeId) ?? []), index + 1])
	})

	// Where the next leaf goes, counting down the page in reading order.
	let cursor = 0
	// The bottom edge each column has reached, so a parent centred on a short
	// subtree cannot ride up into the box above it.
	const floors: number[] = []

	const place = (
		node: OutlineNode | null,
		depth: number,
		ordinal: string,
		parentKey: string | null,
		ancestors: string[],
	): MapNode => {
		const key = node === null ? 'root' : `n:${node.id}`
		const referenceNumbers = node === null ? [] : (placed.get(node.id) ?? [])
		const height = heightOf(node, depth, referenceNumbers.length)
		const children = node === null ? plan.outline : node.children
		const isCollapsed = node !== null && collapsed.has(node.id)

		const entry: MapNode = {
			key,
			parentKey,
			nodeId: node === null ? null : node.id,
			node,
			title: node === null ? plan.title : node.title,
			ordinal,
			depth,
			x: depth * (nodeWidth + columnGap),
			y: 0,
			width: nodeWidth,
			height,
			childCount: children.length,
			referenceNumbers,
			collapsed: isCollapsed,
			ancestors,
		}

		// Pushed before the children, so a subtree occupies one run of the array
		// and shifting it is a slice rather than a second walk.
		const start = nodes.length
		nodes.push(entry)

		const drawn = isCollapsed ? [] : children
		const laid = drawn.map((child, index) =>
			place(
				child,
				depth + 1,
				ordinal === '' ? `${index + 1}` : `${ordinal}.${index + 1}`,
				key,
				[key, ...ancestors],
			),
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

	place(null, 0, '', null, [])

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
