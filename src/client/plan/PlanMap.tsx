import { useState } from 'react'

import type { Plan } from '../../shared/plan'
import { cx } from '../lib/cx'
import type { MapNode, MapOptions } from './map'
import { planMap } from './map'

/**
 * The Map View of the Plan — the Outline opened left to right, with the Article
 * title as the root and the Sections branching off it.
 *
 * **It reads the Plan and never writes it.** Collapsing a Section hides its
 * children on this map and changes nothing in the Plan, so the writer can fold
 * a long piece down to its shape without editing it. `PlanPanel.tsx` is where
 * the Outline is edited, and its ops are the only way a Plan changes —
 * `docs/architecture.md` §"The Plan Panel's edits are ops".
 *
 * `map.ts` holds every number on screen. This file draws them and computes
 * none, so what a test measures and what the writer sees cannot drift apart.
 *
 * The one colour decision: the path back to the root lights in ink rather than
 * accent, because a hover is transient and the accent is rationed to one thing
 * per screen — `foundations/Accent.mdx`.
 */

export interface PlanMapProps {
	plan: Plan
	/** Room around the drawing, so a lit box's border is not clipped. */
	padding?: number
	/** Passed through to the layout — column widths, gaps, box heights. */
	layout?: Omit<MapOptions, 'collapsed'>
	className?: string
}

export function PlanMap({ plan, padding = 12, layout, className }: PlanMapProps) {
	// Which Sections are folded, and which box the pointer or the caret is on.
	// Both belong to this View: neither is in the Plan, and reopening the Panel
	// starts the map unfolded.
	const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
	const [lit, setLit] = useState<string | null>(null)

	const { nodes, links, width, height } = planMap(plan, { ...layout, collapsed })

	const onPath = new Set<string>()
	const litNode = nodes.find((node) => node.key === lit)
	if (litNode !== undefined) {
		onPath.add(litNode.key)
		for (const ancestor of litNode.ancestors) onPath.add(ancestor)
	}

	const fold = (nodeId: string) =>
		setCollapsed((held) => {
			const next = new Set(held)
			if (!next.delete(nodeId)) next.add(nodeId)

			return next
		})

	return (
		<svg
			aria-label={`Map of ${plan.title === '' ? 'the article' : plan.title}`}
			className={cx('block max-w-full', className)}
			role="img"
			viewBox={`${-padding} ${-padding} ${width + padding * 2} ${height + padding * 2}`}
			width={width + padding * 2}
		>
			{links.map((link) => (
				<path
					key={`${link.parentKey}→${link.childKey}`}
					className={cx(
						'fill-none transition-colors',
						onPath.has(link.parentKey) && onPath.has(link.childKey)
							? 'stroke-ink'
							: 'stroke-rule',
					)}
					d={link.d}
					strokeWidth={1.5}
				/>
			))}

			{nodes.map((node) => (
				<foreignObject
					key={node.key}
					height={node.height}
					width={node.width}
					x={node.x}
					y={node.y}
				>
					<Box
						folded={node.collapsed}
						lit={onPath.has(node.key)}
						node={node}
						onFold={node.nodeId === null ? undefined : () => fold(node.nodeId!)}
						onLeave={() => setLit((held) => (held === node.key ? null : held))}
						onLight={() => setLit(node.key)}
					/>
				</foreignObject>
			))}
		</svg>
	)
}

interface BoxProps {
	node: MapNode
	lit: boolean
	folded: boolean
	/** Absent at the root, which is the Article title and folds nothing. */
	onFold?: () => void
	onLight: () => void
	onLeave: () => void
}

/** One box. The root reads as the Article title, and everything else reads as
 * the row it is in the Panel — number, title, target, intent note. */
function Box({ node, lit, folded, onFold, onLight, onLeave }: BoxProps) {
	const root = node.nodeId === null
	const title =
		node.title === '' ? (root ? 'Untitled article' : 'Untitled section') : node.title
	const target = node.node?.target

	return (
		<div
			className={cx(
				'flex h-full w-full items-start gap-1.5 overflow-hidden rounded-md border bg-surface px-2 py-1.5 transition-colors',
				lit ? 'border-ink' : 'border-edge',
			)}
			onFocus={onLight}
			onBlur={onLeave}
			onMouseEnter={onLight}
			onMouseLeave={onLeave}
		>
			{root ? null : (
				// No fixed width, unlike the Panel's row: a Subsection is numbered
				// "2.1" and would sit under its own title in the three-space the
				// Panel gives a Section.
				<span className="mt-px shrink-0 font-mono text-[0.6875rem] text-faint">
					{node.ordinal}
				</span>
			)}

			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span
					className={cx(
						'line-clamp-2 text-[0.8125rem] leading-snug',
						node.title === '' ? 'text-faint italic' : 'text-ink',
						root && 'font-medium',
					)}
				>
					{title}
				</span>

				{target === undefined && node.node?.intent === undefined ? null : (
					<span className="flex min-w-0 items-baseline gap-1.5 text-[0.6875rem] text-muted">
						{target === undefined ? null : (
							<span className="shrink-0 font-mono text-faint">{target}w</span>
						)}
						{node.node?.intent === undefined ? null : (
							<span className="truncate">{node.node.intent}</span>
						)}
					</span>
				)}

				{/* The References placed here, by the numbers the Panel marks them
				    with — a footnote number rather than anything stored. */}
				{node.referenceNumbers.length === 0 ? null : (
					<span className="flex min-w-0 items-baseline gap-1 font-mono text-[0.625rem] text-faint">
						<span className="shrink-0">refs</span>
						{node.referenceNumbers.map((number) => (
							<span key={number}>[{number}]</span>
						))}
					</span>
				)}
			</div>

			{node.childCount === 0 || onFold === undefined ? null : (
				<button
					aria-expanded={!folded}
					aria-label={`${folded ? 'Open' : 'Fold'} the ${node.childCount} inside ${title}`}
					className="mt-px shrink-0 rounded-full border border-edge px-1 font-mono text-[0.625rem] leading-[1.05rem] text-muted hover:border-ink hover:text-ink"
					onClick={onFold}
					type="button"
				>
					{folded ? node.childCount : '–'}
				</button>
			)}
		</div>
	)
}
