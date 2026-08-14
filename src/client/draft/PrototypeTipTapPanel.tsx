import UniqueID from '@tiptap/extension-unique-id'
import type { Node as PmNode } from '@tiptap/pm/model'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { Button } from '../components/Button'
import { GuidanceNote } from '../components/GuidanceNote'
import { Panel, PanelHeader, type PanelProps } from '../components/Panel'
import {
	type BreakProposal,
	CommentMark,
	ProposedBreaks,
	proposalsKey,
} from './prototype-annotations'
import {
	type BlockEntry,
	type BlockRow,
	assignOrds,
	mintBlockId,
} from './prototype-blocks'

/**
 * PROTOTYPE — issue #14. Throwaway; the TipTap half of the comparison.
 *
 * Same Block contract as the bare-ProseMirror Panel, reached through a library
 * instead of a hand-written plugin, plus the two things bare ProseMirror was
 * not asked to show:
 *
 * - a **comment** anchored to a phrase, stored as a mark, so it appears in the
 *   Block's synced content and survives a rewrite around it,
 * - a **proposed section break**, drawn as a widget decoration, so it appears
 *   nowhere in the rows until the writer accepts it.
 *
 * Writer control comes first here: headings and section breaks are the
 * writer's to type, and the Guide only offers.
 */

const SEEDED = `
<p data-block-id="b1">The council voted on Tuesday to extend the scheme for another eighteen months, over the objections of two of its own committee chairs.</p>
<p data-block-id="b2">Officers put the cost at £2.4m. That figure has not been published, and the two chairs who voted against say they were shown it for the first time in the room.</p>
<p data-block-id="b3">The scheme began as a pilot in 2023, covering four wards. It now covers eleven.</p>
<p data-block-id="b4">Residents in the two wards added last spring describe a service that arrives late. Residents in the original four describe one that arrives at all. Residents outside the scheme describe nothing.</p>
`

interface MarginNote {
	/** A Block id, or a comment id — whichever the note hangs from. */
	anchor: string
	title: string
	body: string
	kind: 'guidance' | 'comment'
}

const GUIDANCE: readonly MarginNote[] = [
	{
		anchor: 'b2',
		title: 'The central figure is unsourced',
		body: 'The piece rests on £2.4m and nothing attributes it.',
		kind: 'guidance',
	},
]

const PROPOSALS: readonly BreakProposal[] = [{ id: 'p1', beforeBlockId: 'b3' }]

/** Every block-level node the Draft syncs as a row. */
const BLOCKS = new Set(['paragraph', 'heading', 'horizontalRule'])

export function PrototypeTipTapPanel({ divider }: { divider?: PanelProps['divider'] }) {
	const margin = useRef<HTMLDivElement>(null)
	const surface = useRef<HTMLDivElement>(null)
	const [rows, setRows] = useState<BlockRow[]>([])
	const [comments, setComments] = useState<readonly MarginNote[]>([])
	const [tops, setTops] = useState<Record<string, number>>({})
	const carried = useRef<BlockRow[]>([])
	carried.current = rows

	const editor = useEditor({
		extensions: [
			StarterKit,
			UniqueID.configure({
				// Renders as `data-block-id`, so both Panels measure the same way.
				attributeName: 'block-id',
				types: [...BLOCKS],
				generateID: () => mintBlockId(),
			}),
			CommentMark,
			ProposedBreaks,
		],
		content: SEEDED,
		onUpdate: ({ editor: live }) => setRows(readRows(live, carried.current)),
	})

	// Seeding runs here rather than in `onCreate`, which fires while the
	// component is still mounting and cannot take a state update.
	useEffect(() => {
		if (editor === null) return

		editor.view.dispatch(editor.state.tr.setMeta(proposalsKey, [...PROPOSALS]))
		setRows(readRows(editor, []))
		// PROTOTYPE ONLY — a handle for driving scenarios. Goes with the rest.
		;(window as unknown as { __tiptap?: typeof editor }).__tiptap = editor
	}, [editor])

	const measure = useCallback(() => {
		if (surface.current === null || margin.current === null) return

		const origin = margin.current.getBoundingClientRect().top
		const measured: Record<string, number> = {}

		for (const el of surface.current.querySelectorAll<HTMLElement>(
			'[data-block-id], [data-comment-id]',
		)) {
			const key = el.dataset.blockId ?? el.dataset.commentId
			// A comment mark can be split across several spans; the first wins.
			if (key !== undefined && measured[key] === undefined) {
				measured[key] = el.getBoundingClientRect().top - origin
			}
		}

		setTops(measured)
	}, [])

	useLayoutEffect(measure, [rows, comments, measure])

	useEffect(() => {
		if (surface.current === null) return
		const observer = new ResizeObserver(measure)
		observer.observe(surface.current)
		return () => observer.disconnect()
	}, [measure])

	const addComment = () => {
		if (editor === null || editor.state.selection.empty) return

		const id = `c${comments.length + 1}`
		const quoted = editor.state.doc.textBetween(
			editor.state.selection.from,
			editor.state.selection.to,
		)

		editor.chain().focus().setMark('comment', { commentId: id }).run()
		setComments((held) => [
			...held,
			{
				anchor: id,
				title: 'Comment on the selection',
				body: `On "${quoted.slice(0, 60)}". Rewrite around it and the anchor holds.`,
				kind: 'comment',
			},
		])
	}

	const notes = [...GUIDANCE, ...comments]

	return (
		<Panel divider={divider} padded={false}>
			<div className="flex flex-col gap-2.5 p-3.5 pb-2">
				<PanelHeader meta="prototype — #14 · TipTap" title="Draft" />
				<Toolbar editor={editor} onComment={addComment} />
			</div>

			<div className="relative flex flex-auto">
				<div
					className="prose-draft min-w-0 flex-1 px-8 py-4 [&_.ProseMirror]:outline-none [&_h2]:mt-6 [&_h2]:text-[1.05rem] [&_h2]:font-semibold [&_h3]:mt-5 [&_h3]:font-semibold [&_hr]:my-6 [&_hr]:border-t [&_hr]:border-edge"
					ref={surface}
				>
					<EditorContent editor={editor} />
				</div>

				<div className="relative w-56 shrink-0 border-l border-edge py-4" ref={margin}>
					{notes.map((note) => {
						const top = tops[note.anchor]
						if (top === undefined) return null

						return (
							<div className="absolute right-3 left-3" key={note.anchor} style={{ top }}>
								<GuidanceNote
									anchor={note.anchor}
									body={note.body}
									confidence={note.kind === 'comment' ? 'tentative' : 'confident'}
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
							<span className="min-w-0 truncate text-muted">{row.text}</span>
						</li>
					))}
				</ol>
				<p className="text-[0.75rem] leading-relaxed text-faint">
					A comment appears in the row it marks. The proposed break appears in no row at
					all until it is accepted.
				</p>
			</div>
		</Panel>
	)
}

/** Reads the rows the Draft would sync, marks included and decorations not. */
function readRows(
	editor: NonNullable<ReturnType<typeof useEditor>>,
	previous: readonly BlockRow[],
): BlockRow[] {
	const entries: BlockEntry[] = []

	editor.state.doc.descendants((node) => {
		if (!BLOCKS.has(node.type.name)) return false

		const id = node.attrs['block-id'] as string | null
		if (id === null) return false

		const commented = node.type.name !== 'horizontalRule' && hasComment(node)
		const body =
			node.type.name === 'horizontalRule'
				? '—— section break ——'
				: `${node.type.name === 'heading' ? `H${node.attrs.level as number} ` : ''}${node.textContent}`

		entries.push({ id, text: commented ? `💬 ${body}` : body })
		return false
	})

	return assignOrds(entries, previous)
}

function hasComment(node: PmNode): boolean {
	let found = false
	node.descendants((child) => {
		if (child.marks.some((mark) => mark.type.name === 'comment')) found = true
	})
	return found
}

function Toolbar({
	editor,
	onComment,
}: {
	editor: ReturnType<typeof useEditor>
	onComment: () => void
}) {
	if (editor === null) return null

	const chain = () => editor.chain().focus()

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			<Mark active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()}>
				bold
			</Mark>
			<Mark
				active={editor.isActive('italic')}
				onClick={() => chain().toggleItalic().run()}
			>
				italic
			</Mark>
			<Mark
				active={editor.isActive('underline')}
				onClick={() => chain().toggleUnderline().run()}
			>
				underline
			</Mark>
			<Mark
				active={editor.isActive('heading', { level: 2 })}
				onClick={() => chain().toggleHeading({ level: 2 }).run()}
			>
				H2
			</Mark>
			<Mark
				active={editor.isActive('heading', { level: 3 })}
				onClick={() => chain().toggleHeading({ level: 3 }).run()}
			>
				H3
			</Mark>
			<Mark active={false} onClick={() => chain().setHorizontalRule().run()}>
				section break
			</Mark>
			<Button onClick={onComment} size="sm" variant="quiet">
				comment on selection
			</Button>
		</div>
	)
}

function Mark({
	active,
	onClick,
	children,
}: {
	active: boolean
	onClick: () => void
	children: string
}) {
	return (
		<button
			className={`rounded-md border px-2 py-0.5 text-[0.75rem] ${
				active
					? 'border-accent-edge bg-accent-soft text-accent-ink'
					: 'border-edge text-muted'
			}`}
			onClick={onClick}
			type="button"
		>
			{children}
		</button>
	)
}
