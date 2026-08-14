import { baseKeymap } from 'prosemirror-commands'
import { history, redo, undo } from 'prosemirror-history'
import { keymap } from 'prosemirror-keymap'
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import 'prosemirror-view/style/prosemirror.css'

import { Button } from '../components/Button'
import { GuidanceNote } from '../components/GuidanceNote'
import { Panel, PanelHeader, type PanelProps } from '../components/Panel'
import { type BlockRow, blockIds, orphaned, schema, toRows } from './prototype-blocks'

/**
 * PROTOTYPE — issue #14, picking the Draft editor. Throwaway; not phase 2.
 *
 * Shows the two things #14 asks to see together, plus the case that actually
 * separates the candidates:
 *
 * - a Guidance note anchored beside a real paragraph, holding while the writer
 *   types above it,
 * - that paragraph as its own row, in the shape #7 fixed,
 * - what becomes of both when the paragraph is split, merged, or deleted.
 *
 * Nothing persists. #7 already measured the sync half against the real
 * adapter, so wiring party-db in would re-answer a settled question.
 */

/** Seeded with fixed ids so the notes below have something to point at. */
const OPENING: ReadonlyArray<[string, string]> = [
	[
		'b1',
		'The council voted on Tuesday to extend the scheme for another eighteen months, over the objections of two of its own committee chairs.',
	],
	[
		'b2',
		'Officers put the cost at £2.4m. That figure has not been published, and the two chairs who voted against say they were shown it for the first time in the room.',
	],
	[
		'b3',
		'The scheme began as a pilot in 2023, covering four wards. It now covers eleven.',
	],
	[
		'b4',
		'Residents in the two wards added last spring describe a service that arrives late. Residents in the original four describe one that arrives at all. Residents outside the scheme describe nothing.',
	],
]

interface Note {
	id: string
	anchor: string
	title: string
	body: string
	type: string
}

const NOTES: readonly Note[] = [
	{
		id: 'n1',
		anchor: 'b2',
		title: 'The central figure is unsourced',
		body: 'The piece rests on £2.4m and nothing attributes it. The Plan has no Reference carrying it.',
		type: 'citations',
	},
	{
		id: 'n2',
		anchor: 'b4',
		title: 'Three sentences open the same way',
		body: 'Each begins "Residents". The parallel reads as deliberate once, and as a tic by the third.',
		type: 'repetition',
	},
]

function seededDoc() {
	return schema.node(
		'doc',
		null,
		OPENING.map(([blockId, text]) =>
			schema.node('paragraph', { blockId }, schema.text(text)),
		),
	)
}

function freshState() {
	return EditorState.create({
		doc: seededDoc(),
		plugins: [
			history(),
			keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo }),
			keymap(baseKeymap),
			blockIds(),
		],
	})
}

export function PrototypeDraftPanel({ divider }: { divider?: PanelProps['divider'] }) {
	const mount = useRef<HTMLDivElement>(null)
	const margin = useRef<HTMLDivElement>(null)
	const view = useRef<EditorView>(null)
	const [rows, setRows] = useState<BlockRow[]>([])
	const [tops, setTops] = useState<Record<string, number>>({})

	// `rows` is read inside the transaction handler to carry `ord` forward, and
	// the handler is installed once — so it reads the latest through a ref
	// rather than closing over the first render's value.
	const carried = useRef<BlockRow[]>([])
	carried.current = rows

	useEffect(() => {
		if (mount.current === null) return

		const editor = new EditorView(mount.current, {
			state: freshState(),
			dispatchTransaction(tr) {
				const next = editor.state.apply(tr)
				editor.updateState(next)
				setRows(toRows(next.doc, carried.current))
			},
		})

		view.current = editor
		// PROTOTYPE ONLY — a handle for driving scenarios from the console or a
		// script. Goes when the prototype does.
		;(window as unknown as { __draft?: EditorView }).__draft = editor
		setRows(toRows(editor.state.doc, []))

		return () => {
			editor.destroy()
			view.current = null
		}
	}, [])

	// Both sides are read against the viewport and subtracted: `offsetTop` would
	// put the paragraph in whatever coordinate space its offsetParent happens to
	// be, which is not the margin the note is placed in.
	const measure = useCallback(() => {
		if (mount.current === null || margin.current === null) return

		const origin = margin.current.getBoundingClientRect().top
		const measured: Record<string, number> = {}

		for (const row of carried.current) {
			const p = mount.current.querySelector<HTMLElement>(`[data-block-id="${row.id}"]`)
			if (p !== null) measured[row.id] = p.getBoundingClientRect().top - origin
		}

		setTops(measured)
	}, [])

	// After the rows land, so a note sits beside the paragraph as it is now
	// rather than where it was one keystroke ago.
	useLayoutEffect(measure, [rows, measure])

	// The Panel mounts inside a hidden `Activity`, where every rect is zero, and
	// becoming visible changes no row. Without this the notes keep their
	// first-paint positions until the writer's next keystroke.
	useEffect(() => {
		if (mount.current === null) return

		const observer = new ResizeObserver(measure)
		observer.observe(mount.current)
		return () => observer.disconnect()
	}, [measure])

	const reset = () => {
		if (view.current === null) return
		view.current.updateState(freshState())
		setRows(toRows(view.current.state.doc, []))
	}

	const lost = orphaned(
		rows,
		NOTES.map((note) => note.anchor),
	)

	return (
		<Panel divider={divider} padded={false}>
			<div className="flex flex-col gap-3.5 p-3.5 pb-0">
				<PanelHeader
					actions={
						<Button onClick={reset} size="sm" variant="quiet">
							reset
						</Button>
					}
					meta="prototype — #14"
					title="Draft"
				/>
				<p className="text-[0.75rem] leading-relaxed text-faint">
					Type above a note and its anchor holds. Split a paragraph with Enter, merge one
					into the paragraph before it with Backspace, or delete one outright, and watch
					the rows and the notes below.
				</p>
			</div>

			<div className="relative flex flex-auto">
				{/* The caret already says where focus is, so the surface suppresses the
				    ring the theme puts on everything else. */}
				<div
					className="prose-draft min-w-0 flex-1 px-8 py-5 [&_.ProseMirror]:outline-none"
					ref={mount}
				/>

				<div className="relative w-56 shrink-0 border-l border-edge py-5" ref={margin}>
					{NOTES.map((note) => {
						const top = tops[note.anchor]
						if (top === undefined) return null

						return (
							<div className="absolute right-3 left-3" key={note.id} style={{ top }}>
								<GuidanceNote
									anchor={note.anchor}
									body={note.body}
									confidence="confident"
									title={note.title}
								/>
							</div>
						)
					})}
				</div>
			</div>

			<div className="flex flex-col gap-2 border-t border-edge bg-sunk p-3.5">
				<p className="label-meta">Blocks — one party-db row each</p>
				<ol className="flex flex-col gap-1">
					{rows.map((row) => (
						<li className="flex gap-2 text-[0.75rem] leading-relaxed" key={row.id}>
							<code className="shrink-0 text-accent-ink">{row.id}</code>
							<code className="shrink-0 text-faint">{row.ord.toFixed(3)}</code>
							<span className="min-w-0 truncate text-muted">
								{row.text === '' ? '—' : row.text}
							</span>
						</li>
					))}
				</ol>
				{lost.length === 0 ? null : (
					<p className="text-[0.75rem] leading-relaxed text-accent-ink">
						Notes left with no Block: {lost.join(', ')}. Their anchor pointed at a row
						that no longer exists, and nothing in the data model brought them back.
					</p>
				)}
			</div>
		</Panel>
	)
}
