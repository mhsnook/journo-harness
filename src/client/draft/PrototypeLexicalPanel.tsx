import { $wrapSelectionInMarkNode, MarkNode } from '@lexical/mark'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { $createHeadingNode, HeadingNode, QuoteNode } from '@lexical/rich-text'
import {
	$createParagraphNode,
	$createTextNode,
	$getRoot,
	$getSelection,
	$isRangeSelection,
	FORMAT_TEXT_COMMAND,
	ParagraphNode,
} from 'lexical'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { Button } from '../components/Button'
import { GuidanceNote } from '../components/GuidanceNote'
import { Panel, PanelHeader, type PanelProps } from '../components/Panel'
import { type BlockRow, assignOrds } from './prototype-blocks'
import {
	CommentMarkNode,
	IdHeadingNode,
	IdParagraphNode,
	$isIdBlock,
} from './prototype-lexical-nodes'

/**
 * PROTOTYPE — issue #14. Throwaway; the Lexical arm of the comparison.
 *
 * Held to the same three things the other two Panels were: stable Block ids
 * through editing, a comment anchored to a phrase that survives a rewrite, and
 * a proposed section break drawn over the Draft without being in it.
 *
 * The third one is where Lexical differs. It has no decoration layer — a
 * `DecoratorNode` is a node *in* the document — so a Proposal has to be an
 * overlay positioned from the Block's measured rectangle.
 */

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

interface MarginNote {
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

/** Drawn immediately above this Block, and in no stored row. */
const PROPOSED_BEFORE = 'b3'

export function PrototypeLexicalPanel({ divider }: { divider?: PanelProps['divider'] }) {
	return (
		<LexicalComposer
			initialConfig={{
				namespace: 'draft-prototype',
				onError: (error) => console.error(error),
				// Every built-in that can appear has to be declared, and each one
				// carrying an id needs its own replacement.
				nodes: [
					ParagraphNode,
					HeadingNode,
					QuoteNode,
					MarkNode,
					CommentMarkNode,
					IdParagraphNode,
					IdHeadingNode,
					{ replace: ParagraphNode, with: () => new IdParagraphNode() },
					{
						replace: HeadingNode,
						with: (node: HeadingNode) => new IdHeadingNode(node.getTag()),
					},
				],
				editorState: () => {
					const root = $getRoot()
					root.clear()
					for (const [blockId, text] of OPENING) {
						const paragraph = new IdParagraphNode(blockId)
						paragraph.append($createTextNode(text))
						root.append(paragraph)
					}
				},
			}}
		>
			<DraftBody divider={divider} />
		</LexicalComposer>
	)
}

function DraftBody({ divider }: { divider?: PanelProps['divider'] }) {
	const [editor] = useLexicalComposerContext()
	const margin = useRef<HTMLDivElement>(null)
	const surface = useRef<HTMLDivElement>(null)
	const [rows, setRows] = useState<BlockRow[]>([])
	const [comments, setComments] = useState<readonly MarginNote[]>([])
	const [tops, setTops] = useState<Record<string, number>>({})
	const [proposalTop, setProposalTop] = useState<number | null>(null)
	const [accepted, setAccepted] = useState(false)
	const carried = useRef<BlockRow[]>([])
	carried.current = rows

	useEffect(() => {
		// PROTOTYPE ONLY — a handle for driving scenarios.
		;(window as unknown as { __lexical?: typeof editor }).__lexical = editor

		return editor.registerUpdateListener(({ editorState }) => {
			editorState.read(() => {
				const entries = $getRoot()
					.getChildren()
					.flatMap((node) =>
						$isIdBlock(node)
							? [
									{
										id: (node as IdParagraphNode).getBlockId(),
										text: node.getTextContent(),
									},
								]
							: [],
					)
				setRows(assignOrds(entries, carried.current))
			})
		})
	}, [editor])

	const measure = useCallback(() => {
		if (surface.current === null || margin.current === null) return

		const origin = margin.current.getBoundingClientRect().top
		const measured: Record<string, number> = {}

		for (const el of surface.current.querySelectorAll<HTMLElement>(
			'[data-block-id], [data-comment-id]',
		)) {
			const key = el.dataset.blockId ?? el.dataset.commentId
			if (key !== undefined && measured[key] === undefined) {
				measured[key] = el.getBoundingClientRect().top - origin
			}
		}

		setTops(measured)

		// The Proposal is drawn from a measured rectangle rather than from a
		// document position, because there is no position to hang it on.
		const before = surface.current.querySelector<HTMLElement>(
			`[data-block-id="${PROPOSED_BEFORE}"]`,
		)
		setProposalTop(
			before === null
				? null
				: before.getBoundingClientRect().top -
						surface.current.getBoundingClientRect().top,
		)
	}, [])

	useLayoutEffect(measure, [rows, comments, measure])

	useEffect(() => {
		if (surface.current === null) return
		const observer = new ResizeObserver(measure)
		observer.observe(surface.current)
		return () => observer.disconnect()
	}, [measure])

	const addComment = () => {
		const id = `c${comments.length + 1}`
		let quoted = ''

		editor.update(() => {
			const selection = $getSelection()
			if (!$isRangeSelection(selection) || selection.isCollapsed()) return

			quoted = selection.getTextContent()
			$wrapSelectionInMarkNode(
				selection,
				selection.isBackward(),
				id,
				(ids) => new CommentMarkNode(ids),
			)
		})

		if (quoted === '') return
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

	const acceptBreak = () => {
		editor.update(() => {
			const target = $getRoot()
				.getChildren()
				.find(
					(node) =>
						$isIdBlock(node) &&
						(node as IdParagraphNode).getBlockId() === PROPOSED_BEFORE,
				)

			if (target === undefined) return
			const rule = $createParagraphNode()
			rule.append($createTextNode('—— section break ——'))
			target.insertBefore(rule)
		})
		setAccepted(true)
	}

	const format = (kind: 'bold' | 'italic' | 'underline') =>
		editor.dispatchCommand(FORMAT_TEXT_COMMAND, kind)

	const heading = () =>
		editor.update(() => {
			const selection = $getSelection()
			if (!$isRangeSelection(selection)) return
			const block = selection.anchor.getNode().getTopLevelElement()
			if (block === null) return

			const swapped = $createHeadingNode('h2')
			swapped.append(...block.getChildren())
			block.replace(swapped)
		})

	const notes = [...GUIDANCE, ...comments]

	return (
		<Panel divider={divider} padded={false}>
			<div className="flex flex-col gap-2.5 p-3.5 pb-2">
				<PanelHeader meta="prototype — #14 · Lexical" title="Draft" />
				<div className="flex flex-wrap items-center gap-1.5">
					<Control onClick={() => format('bold')}>bold</Control>
					<Control onClick={() => format('italic')}>italic</Control>
					<Control onClick={() => format('underline')}>underline</Control>
					<Control onClick={heading}>heading</Control>
					<Button onClick={addComment} size="sm" variant="quiet">
						comment on selection
					</Button>
				</div>
			</div>

			<div className="relative flex flex-auto">
				<div className="prose-draft relative min-w-0 flex-1 px-8 py-4" ref={surface}>
					<RichTextPlugin
						contentEditable={<ContentEditable className="outline-none" />}
						ErrorBoundary={LexicalErrorBoundary}
					/>
					<HistoryPlugin />

					{accepted || proposalTop === null ? null : (
						<div
							// The overlay is not in the document, so it takes no space and covers the
							// prose instead of parting it. `pointer-events-none` keeps the paragraph
							// beneath it clickable; the button opts back in.
							className="pointer-events-none absolute right-8 left-8 flex items-center gap-2 border-y border-dashed border-accent-edge py-1.5"
							style={{ top: proposalTop - 26 }}
						>
							<span className="label-meta text-accent-ink">proposed section break</span>
							<button
								className="pointer-events-auto ml-auto rounded-md border border-accent-edge px-2 py-0.5 text-[0.75rem] text-accent-ink"
								onClick={acceptBreak}
								type="button"
							>
								accept
							</button>
						</div>
					)}
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
							<code className="shrink-0 text-accent-ink">{row.id.slice(0, 8)}</code>
							<code className="shrink-0 text-faint">{row.ord.toFixed(3)}</code>
							<span className="min-w-0 truncate text-muted">{row.text}</span>
						</li>
					))}
				</ol>
			</div>
		</Panel>
	)
}

function Control({ onClick, children }: { onClick: () => void; children: string }) {
	return (
		<button
			className="rounded-md border border-edge px-2 py-0.5 text-[0.75rem] text-muted"
			onClick={onClick}
			type="button"
		>
			{children}
		</button>
	)
}
