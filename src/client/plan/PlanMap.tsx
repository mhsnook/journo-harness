import { useCallback, useMemo, useState } from 'react'

import type { Plan, ProposalInput } from '../../shared/plan'
import { sectionIsEmpty } from '../../shared/plan'
import { cx } from '../lib/cx'
import { addSection, deleteSection } from './edits'
import type { MapBranches, MapNode } from './map'
import { planMap } from './map'
import { outlineEntries } from './outline'
import { referenceMark } from './references'
import { SectionRow } from './SectionRow'

/**
 * The Map View of the Plan — the Plan opened left to right, with the Article
 * title as the root.
 *
 * `map.ts` places every box and every curve, and picks what branches off a
 * Section — the References placed there, or the Sections nested inside it
 * (`MapOptions.branches`). What this file adds is the padding around the
 * drawing and where the open Section's fields are anchored.
 *
 * **Reading and writing are separate here.** Folding a Section hides its
 * children on this map and changes nothing in the Plan — that state belongs to
 * the View. Editing goes the one way every Plan surface goes: `SectionRow`
 * builds ops and `edit` applies them, so the map cannot make a change the
 * applier would refuse — `docs/architecture.md` §"The Plan Panel's edits are
 * ops".
 *
 * **The open Section's fields sit over the map, not in it.** They are anchored
 * at the box and painted above its neighbours without joining the layout, so
 * nothing reflows around what the writer is editing.
 *
 * **The map draws at its own size and scrolls sideways.** It must not be scaled
 * to fit: the fields are positioned in the same units the boxes are, and
 * scaling puts the two out of register.
 *
 * The path back to the root lights in ink rather than accent, because the
 * accent is rationed to one thing per screen — `foundations/Accent.mdx`.
 */

/**
 * How wide the open Section's fields sit — well past a box's own width, and
 * past what the two fields on the title line strictly need. A Section is a
 * thing the writer works in rather than glances at, so the card reads as
 * somewhere to write rather than as a box that grew.
 */
const DETAIL_WIDTH = 520

/** Room around the drawing, so a lit box's border is not clipped. */
const PADDING = 12

export interface PlanMapProps {
	plan: Plan
	/** The Plan's one writer, taken as the Panel takes it. */
	edit: (ops: ProposalInput | null) => void
	/** What branches off a Section — `map.ts`. */
	branches?: MapBranches
	className?: string
}

export function PlanMap({
	plan,
	edit,
	branches = 'references',
	className,
}: PlanMapProps) {
	// Which Sections are folded, which box the pointer or the caret is on, and
	// which one is open. All three belong to this View: none is in the Plan, and
	// reopening the Panel starts the map unfolded and shut.
	const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
	const [lit, setLit] = useState<string | null>(null)
	const [openId, setOpenId] = useState<string | null>(null)
	// The Section `+` just made, which is thrown away again if the writer leaves
	// it with nothing in it.
	const [made, setMade] = useState<string | null>(null)
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

	// Held: a pointer sweeping the map fires `setLit` once per box, and none of
	// those renders changes where anything sits.
	const { nodes, links, width, height } = useMemo(
		() => planMap(plan, { branches, collapsed }),
		[plan, branches, collapsed],
	)

	/**
	 * Leaves whatever is open, and throws away a Section `+` made that the writer
	 * put nothing into. Empty means every field: a Section carrying only an
	 * intent note is still work, and it stays.
	 */
	const close = () => {
		if (made !== null) {
			if (sectionIsEmpty(plan, made)) edit(deleteSection(made))
			setMade(null)
		}
		setOpenId(null)
	}

	/** Opens one box, having first cleared up after the last. */
	const open = (id: string) => {
		close()
		setOpenId(id)
	}

	const fold = (nodeId: string) =>
		setCollapsed((held) => {
			const next = new Set(held)
			if (!next.delete(nodeId)) next.add(nodeId)

			return next
		})

	/**
	 * A new Section inside the box that was clicked, last among what is already
	 * there, open on arrival with the caret in its title.
	 *
	 * Only the Article title offers this under `branches: 'references'`. Two
	 * levels is what the interface offers, and a third has no word the writer
	 * holds — `context.md` §Subsection.
	 */
	const add = (parentId: string | null) => {
		const id = crypto.randomUUID()
		close()
		edit(addSection({ parentId, beforeId: null }, id))

		// A child of a folded Section would land undrawn, so adding one opens it.
		if (parentId !== null) {
			setCollapsed((held) => {
				const next = new Set(held)
				next.delete(parentId)

				return next
			})
		}
		setOpenId(id)
		setMade(id)
	}

	// A folded Section can hold the open one, and a Section can be deleted from
	// its own detail. Either leaves `openId` naming a box that is not drawn, so
	// the open box is looked up in what was laid out rather than in the Plan.
	const opened =
		nodes.find(
			(node) => node.subject.kind === 'section' && node.subject.node.id === openId,
		) ?? null
	const entry =
		openId === null || opened === null
			? null
			: (outlineEntries(plan.outline).find((one) => one.node.id === openId) ?? null)

	const detail = opened === null || entry === null ? null : { node: opened, entry }

	// The pointer wins over the open Section, so the writer can trace another
	// branch without shutting what they are editing. With neither, nothing lights.
	const onPath = new Set<string>()
	const traced = nodes.find((node) => node.key === (lit ?? opened?.key))
	if (traced !== undefined) {
		onPath.add(traced.key)
		for (const ancestor of traced.ancestors) onPath.add(ancestor)
	}

	const drawnWidth = width + PADDING * 2
	const drawnHeight = height + PADDING * 2

	return (
		<div
			// Found by this attribute rather than by a class, the way the Frame and
			// the Panel are, so renaming a Tailwind class cannot quietly empty the
			// test that measures this box.
			data-plan-map=""
			// `shrink-0` because `overflow-x-auto` resolves this box's `min-height`
			// to 0, and the Panel is a flex column that overflows — without it the
			// map is squeezed to nothing rather than scrolling the Panel.
			className={cx('relative shrink-0 overflow-x-auto', className)}
			onKeyDown={(event) => {
				// `SectionRow` stops its own Escape, so this one only ever reaches a
				// box the writer tabbed to rather than the fields they have open.
				if (event.key !== 'Escape') return
				close()
			}}
		>
			<div
				className="relative"
				// Every box and the open detail stop their own clicks, so a click that
				// reaches here is one on the space between them.
				onClick={close}
				style={{
					width:
						detail === null
							? drawnWidth
							: Math.max(drawnWidth, detail.node.x + PADDING + DETAIL_WIDTH),
					height:
						detail === null
							? drawnHeight
							: Math.max(drawnHeight, detail.node.y + PADDING + detailHeight),
				}}
			>
				<svg
					aria-label={`Map of ${plan.title === '' ? 'the article' : plan.title}`}
					className="block"
					height={drawnHeight}
					role="img"
					viewBox={`${-PADDING} ${-PADDING} ${drawnWidth} ${drawnHeight}`}
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

					{nodes.map((node) => {
						// Pulled out of the node so the narrowing survives into the
						// handlers below, which a property access would not.
						const { subject } = node
						const section = subject.kind === 'section' ? subject.node : null
						// Where a new Section would go, and null where this box takes
						// none. Under `references` that is the Article title alone.
						const addsInto =
							subject.kind === 'article'
								? { id: null }
								: section !== null && branches === 'sections'
									? { id: section.id }
									: null

						return (
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
									onAdd={addsInto === null ? undefined : () => add(addsInto.id)}
									// A Reference is edited in the References list, and the root
									// is the Article title rather than a Section. Neither folds
									// or opens Section fields.
									onFold={section === null ? undefined : () => fold(section.id)}
									onLeave={() => setLit((held) => (held === node.key ? null : held))}
									onLight={() => setLit(node.key)}
									onOpen={section === null ? undefined : () => open(section.id)}
									open={section !== null && section.id === openId}
								/>
							</foreignObject>
						)
					})}
				</svg>

				{detail === null ? null : (
					<div
						ref={measure}
						// Grows out of the box's own top-left corner, which is where the
						// writer clicked, so the fields read as that box opening rather than
						// as a card arriving from nowhere. `starting:` is the opening state
						// of a newly mounted element — @starting-style.
						className="absolute z-10 origin-top-left scale-100 rounded-md opacity-100 shadow-frame transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none starting:scale-95 starting:opacity-0"
						onClick={(event) => event.stopPropagation()}
						style={{
							left: detail.node.x + PADDING,
							top: detail.node.y + PADDING,
							width: DETAIL_WIDTH,
						}}
					>
						{/* No `onShowReference`: the map has no References list to send
						    the writer down to, so a placed Reference reads as text here
						    rather than as a control that would do nothing. */}
						<SectionRow
							className="gap-3 p-3.5"
							edit={edit}
							entry={detail.entry}
							onOpen={close}
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
	/** Absent where the box holds no Sections to fold. */
	onFold?: () => void
	/** Absent where the box has no Section fields to open. */
	onOpen?: () => void
	/** Make a Section inside this one. Absent where the map draws none there. */
	onAdd?: () => void
	onLight: () => void
	onLeave: () => void
}

/**
 * One box. The root reads as the Article title, a Section reads as the row it
 * is in the Panel, and a Reference reads as its mark and its name.
 *
 * The whole box opens the Section, and the title carries that as a real button
 * so it is reachable by keyboard and named to a screen reader.
 *
 * The right edge holds what the box says about its children: fold what is
 * already inside, and add one more. Every control here stops the click going
 * any further, so a click that reaches the map behind them is a click on the
 * space between boxes, which is what shuts whatever is open.
 */
function Box({
	node,
	lit,
	folded,
	open,
	onFold,
	onOpen,
	onAdd,
	onLight,
	onLeave,
}: BoxProps) {
	const { subject } = node
	const untitled = node.title === ''
	const title = untitled
		? subject.kind === 'article'
			? 'Untitled article'
			: 'Untitled section'
		: node.title

	const target = subject.kind === 'section' ? subject.node.target : undefined
	const intent = subject.kind === 'section' ? subject.node.intent : undefined

	return (
		<div
			className={cx(
				'flex h-full w-full items-start gap-1.5 overflow-hidden rounded-md border bg-surface px-2 py-1.5 transition-colors',
				lit ? 'border-ink' : 'border-edge',
				onOpen && 'cursor-pointer',
			)}
			onClick={(event) => {
				event.stopPropagation()
				onOpen?.()
			}}
			onFocus={onLight}
			onBlur={onLeave}
			onMouseEnter={onLight}
			onMouseLeave={onLeave}
		>
			{node.ordinal === '' ? null : (
				// No fixed width, unlike the Panel's row: a Reference is marked "[3]"
				// and would sit under its own name in the three-space the Panel gives
				// a Section.
				<span className="mt-px shrink-0 font-mono text-[0.6875rem] text-faint">
					{node.ordinal}
				</span>
			)}

			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				{onOpen === undefined ? (
					<span
						className={cx(
							'line-clamp-2 text-[0.8125rem] leading-snug',
							subject.kind === 'article' && 'font-medium',
							subject.kind === 'reference' ? 'text-muted' : 'text-ink',
						)}
					>
						{title}
					</span>
				) : (
					<button
						aria-expanded={open}
						className={cx(
							'line-clamp-2 text-left text-[0.8125rem] leading-snug',
							untitled ? 'text-faint italic' : 'text-ink',
						)}
						onClick={(event) => {
							event.stopPropagation()
							onOpen()
						}}
						type="button"
					>
						{title}
					</button>
				)}

				{subject.kind === 'reference' ? (
					<span className="label-meta truncate">{referenceMark(subject)}</span>
				) : null}

				{target === undefined && intent === undefined ? null : (
					<span className="flex min-w-0 items-baseline gap-1.5 text-[0.6875rem] text-muted">
						{target === undefined ? null : (
							<span className="shrink-0 font-mono text-faint">{target}w</span>
						)}
						{intent === undefined ? null : <span className="truncate">{intent}</span>}
					</span>
				)}

				{/* Only where the References are not boxes of their own — otherwise
				    the map would say the same placement twice. */}
				{node.referenceNumbers.length === 0 ? null : (
					<span className="truncate font-mono text-[0.625rem] text-faint">
						{`refs ${node.referenceNumbers.map((number) => `[${number}]`).join(' ')}`}
					</span>
				)}
			</div>

			{/* The two controls about this box's children, on the edge the children
			    hang off. Stacked rather than side by side, which costs the title
			    one column of width instead of two. */}
			{onFold === undefined && onAdd === undefined ? null : (
				<div className="flex h-full shrink-0 flex-col items-end">
					{node.childCount === 0 || onFold === undefined ? null : (
						<button
							aria-expanded={!folded}
							aria-label={`${folded ? 'Open' : 'Fold'} the ${node.childCount} inside ${title}`}
							className={CONTROL}
							onClick={(event) => {
								event.stopPropagation()
								onFold()
							}}
							type="button"
						>
							{folded ? node.childCount : '–'}
						</button>
					)}

					{onAdd === undefined ? null : (
						<button
							aria-label={
								subject.kind === 'article'
									? 'Add a Section to the Outline'
									: `Add a Section inside ${title}`
							}
							className={cx(CONTROL, 'mt-auto')}
							onClick={(event) => {
								event.stopPropagation()
								onAdd()
							}}
							type="button"
						>
							+
						</button>
					)}
				</div>
			)}
		</div>
	)
}

/** Both edge controls, which are the same target at the same weight: quiet
 * until the pointer or the caret reaches them. */
const CONTROL =
	'shrink-0 rounded-full border border-edge px-1 font-mono text-[0.625rem] leading-[1.05rem] text-muted transition-colors hover:border-ink hover:text-ink'
