import { useCallback, useState } from 'react'

import type { Plan, ProposalInput } from '../../shared/plan'
import { cx } from '../lib/cx'
import type { MapNode, MapOptions } from './map'
import { planMap } from './map'
import { outlineEntries } from './outline'
import { SectionRow } from './SectionRow'

/**
 * The Map View of the Plan — the Outline opened left to right, with the Article
 * title as the root and the Sections branching off it.
 *
 * `map.ts` holds every number on screen. This file draws them and computes
 * none, so what a test measures and what the writer sees cannot drift apart.
 *
 * **Reading and writing are separate here.** Folding a Section hides its
 * children on this map and changes nothing in the Plan — that state belongs to
 * the View. Editing goes the one way every Plan surface goes: `SectionRow`
 * builds ops and `edit` applies them, so the map cannot make a change the
 * applier would refuse — `docs/architecture.md` §"The Plan Panel's edits are
 * ops".
 *
 * **The detail sits over the map rather than in it.** Clicking a box opens the
 * Section's fields anchored at that box, painted above its neighbours without
 * joining the layout. Growing the box in place would reflow the whole map —
 * parents recentre and siblings move — so the writer would lose the shape they
 * clicked into. A dialog keeps the map still but throws away where they were.
 *
 * The map draws at its own size and scrolls sideways rather than shrinking to
 * fit. Scaling it down would put the detail's pixels out of register with the
 * boxes, and would make a wide Outline unreadable anyway.
 *
 * The one colour decision: the path back to the root lights in ink rather than
 * accent, because a hover is transient and the accent is rationed to one thing
 * per screen — `foundations/Accent.mdx`.
 */

/** How wide the detail sits. Room for the two fields `SectionRow` puts on one
 * line, which a box's own width has none of. */
const DETAIL_WIDTH = 380

export interface PlanMapProps {
	plan: Plan
	/** The Plan's one writer, taken as the Panel takes it. */
	edit: (ops: ProposalInput | null) => void
	/** Room around the drawing, so a lit box's border is not clipped. */
	padding?: number
	/** Passed through to the layout — column widths, gaps, box heights. */
	layout?: Omit<MapOptions, 'collapsed'>
	className?: string
}

export function PlanMap({ plan, edit, padding = 12, layout, className }: PlanMapProps) {
	// Which Sections are folded, which box the pointer or the caret is on, and
	// which one is open. All three belong to this View: none is in the Plan, and
	// reopening the Panel starts the map unfolded and shut.
	const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
	const [lit, setLit] = useState<string | null>(null)
	const [openId, setOpenId] = useState<string | null>(null)
	// What the open detail measured, so the scroll area reaches its foot. Read
	// off the element rather than guessed: how tall the fields run depends on
	// what the Section carries, and it changes under the writer as they type an
	// intent note long enough to wrap.
	const [detailHeight, setDetailHeight] = useState(0)

	// Held, so React attaches it once rather than re-running it every render.
	const measure = useCallback((element: HTMLDivElement | null) => {
		if (element === null) return

		setDetailHeight(element.offsetHeight)
		// The box that was clicked is on screen, but the fields that open below it
		// need not be. `nearest` moves the Panel the least that shows them, so a
		// Section near the top does not move at all.
		element.scrollIntoView({ block: 'nearest', inline: 'nearest' })

		const observer = new ResizeObserver(() => setDetailHeight(element.offsetHeight))
		observer.observe(element)

		return () => observer.disconnect()
	}, [])

	const { nodes, links, width, height } = planMap(plan, { ...layout, collapsed })

	const fold = (nodeId: string) =>
		setCollapsed((held) => {
			const next = new Set(held)
			if (!next.delete(nodeId)) next.add(nodeId)

			return next
		})

	// A folded Section can hold the open one, and a Section can be deleted from
	// its own detail. Either leaves `openId` naming a box that is not drawn, so
	// the open node is looked up in what was laid out rather than in the Plan.
	const open =
		nodes.find((node) => node.nodeId !== null && node.nodeId === openId) ?? null
	const entry =
		open === null
			? null
			: (outlineEntries(plan.outline).find((one) => one.node.id === open.nodeId) ?? null)

	const detail = open === null || entry === null ? null : { node: open, entry }

	// The pointer wins over the open Section, so the writer can trace another
	// branch without shutting what they are editing. With neither, nothing lights.
	const onPath = new Set<string>()
	const traced = nodes.find((node) => node.key === (lit ?? open?.key))
	if (traced !== undefined) {
		onPath.add(traced.key)
		for (const ancestor of traced.ancestors) onPath.add(ancestor)
	}

	const drawnWidth = width + padding * 2
	const drawnHeight = height + padding * 2

	return (
		<div className={cx('relative overflow-x-auto', className)}>
			<div
				className="relative"
				style={{
					width:
						detail === null
							? drawnWidth
							: Math.max(drawnWidth, detail.node.x + padding + DETAIL_WIDTH),
					height:
						detail === null
							? drawnHeight
							: Math.max(drawnHeight, detail.node.y + padding + detailHeight),
				}}
			>
				<svg
					aria-label={`Map of ${plan.title === '' ? 'the article' : plan.title}`}
					className="block"
					height={drawnHeight}
					role="img"
					viewBox={`${-padding} ${-padding} ${drawnWidth} ${drawnHeight}`}
					width={drawnWidth}
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
								// The root is the Article title rather than a Section, so it
								// folds nothing and has no Section fields to open.
								onFold={node.nodeId === null ? undefined : () => fold(node.nodeId!)}
								onLeave={() => setLit((held) => (held === node.key ? null : held))}
								onLight={() => setLit(node.key)}
								onOpen={node.nodeId === null ? undefined : () => setOpenId(node.nodeId)}
								open={node.nodeId === openId}
							/>
						</foreignObject>
					))}
				</svg>

				{detail === null ? null : (
					<div
						ref={measure}
						className="absolute z-10 rounded-md shadow-frame"
						style={{
							left: detail.node.x + padding,
							top: detail.node.y + padding,
							width: DETAIL_WIDTH,
						}}
					>
						<SectionRow
							edit={edit}
							entry={detail.entry}
							onOpen={() => setOpenId(null)}
							// The map has no References list to send the writer down to.
							// Placing one is in the row's own fields, which are right here.
							onShowReference={() => {}}
							open
							plan={plan}
						/>
					</div>
				)}
			</div>
		</div>
	)
}

interface BoxProps {
	node: MapNode
	lit: boolean
	folded: boolean
	/** True while this Section's fields sit open over the map. */
	open: boolean
	/** Absent at the root, which is the Article title and folds nothing. */
	onFold?: () => void
	/** Absent at the root, which has no Section fields to open. */
	onOpen?: () => void
	onLight: () => void
	onLeave: () => void
}

/**
 * One box. The root reads as the Article title, and everything else reads as
 * the row it is in the Panel — number, title, target, intent note, References.
 *
 * The whole box opens the Section, and the title carries that as a real button
 * so it is reachable by keyboard and named to a screen reader. The fold control
 * stops the click going any further: it changes what the map draws, and the box
 * around it changes what the writer is editing.
 */
function Box({ node, lit, folded, open, onFold, onOpen, onLight, onLeave }: BoxProps) {
	const root = node.nodeId === null
	const title =
		node.title === '' ? (root ? 'Untitled article' : 'Untitled section') : node.title
	const target = node.node?.target

	return (
		<div
			className={cx(
				'flex h-full w-full items-start gap-1.5 overflow-hidden rounded-md border bg-surface px-2 py-1.5 transition-colors',
				lit ? 'border-ink' : 'border-edge',
				onOpen && 'cursor-pointer',
			)}
			onClick={onOpen}
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
				{onOpen === undefined ? (
					<span
						className={cx(
							'line-clamp-2 text-[0.8125rem] leading-snug',
							node.title === '' ? 'text-faint italic' : 'text-ink',
							root && 'font-medium',
						)}
					>
						{title}
					</span>
				) : (
					<button
						aria-expanded={open}
						className={cx(
							'line-clamp-2 text-left text-[0.8125rem] leading-snug',
							node.title === '' ? 'text-faint italic' : 'text-ink',
						)}
						onClick={onOpen}
						type="button"
					>
						{title}
					</button>
				)}

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
					onClick={(event) => {
						event.stopPropagation()
						onFold()
					}}
					type="button"
				>
					{folded ? node.childCount : '–'}
				</button>
			)}
		</div>
	)
}
