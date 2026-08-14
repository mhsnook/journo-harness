import { Extension, Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'

/**
 * A comment's anchor, stored in the prose rather than beside it.
 *
 * The writer can rewrite a paragraph in a session that never rendered the Notes
 * Panel, and only a mark moves with the text through that. The comment's body
 * is a row in the Article Agent's SQLite; this is the end that has to survive
 * editing. A comment's target is the span from its first marked position to its
 * last, so prose written into the middle of one belongs to it.
 */
export const CommentMark = Mark.create({
	name: 'comment',
	// Guards the trailing edge; `keepOnSplit` guards the leading edge of the new
	// half after a split. Without both, prose the writer adds beside a comment
	// silently joins it. Text typed *within* the run does join it, and should:
	// the alternative shatters the comment when the writer fixes a typo.
	inclusive: false,
	keepOnSplit: false,

	addAttributes() {
		return {
			commentId: {
				default: null,
				parseHTML: (el: HTMLElement) => el.getAttribute('data-comment-id'),
				renderHTML: (attrs: Record<string, unknown>) =>
					attrs.commentId === null ? {} : { 'data-comment-id': attrs.commentId },
			},
		}
	},

	parseHTML() {
		return [{ tag: 'span[data-comment-id]' }]
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'span',
			mergeAttributes(HTMLAttributes, {
				class: 'rounded-sm bg-accent-soft underline decoration-accent-edge',
			}),
			0,
		]
	},
})

/** A section break the Guide offers, which the writer has not accepted. */
export interface BreakProposal {
	id: string
	/** Drawn immediately before this Block. */
	beforeBlockId: string
}

export const proposalsKey = new PluginKey<BreakProposal[]>('proposed-breaks')

/** Replaces the Proposals on screen. */
export function setProposals(view: EditorView, proposals: readonly BreakProposal[]) {
	view.dispatch(view.state.tr.setMeta(proposalsKey, [...proposals]))
}

/**
 * Draws each Proposal as a widget decoration, at a position the document does
 * not contain. A Proposal is never in the Draft, so it never syncs and never
 * reaches the Final; accepting one is the single transaction that puts a real
 * node in its place.
 */
export const ProposedBreaks = Extension.create({
	name: 'proposedBreaks',

	addProseMirrorPlugins() {
		return [
			new Plugin<BreakProposal[]>({
				key: proposalsKey,

				state: {
					init: () => [],
					apply: (tr, current) =>
						(tr.getMeta(proposalsKey) as BreakProposal[] | undefined) ?? current,
				},

				props: {
					decorations(state) {
						const proposals = proposalsKey.getState(state) ?? []
						if (proposals.length === 0) return DecorationSet.empty

						const at = new Map<string, number>()
						state.doc.descendants((node, pos) => {
							const id = node.attrs['block-id'] as string | null | undefined
							if (id !== undefined && id !== null) at.set(id, pos)
							return false
						})

						const widgets = proposals.flatMap((proposal) => {
							const pos = at.get(proposal.beforeBlockId)
							if (pos === undefined) return []

							return [
								Decoration.widget(
									pos,
									(view, getPos) => renderProposal(proposal, view, getPos),
									{
										side: -1,
										ignoreSelection: true,
										// Without this the editor reads a press on the widget as a
										// press on the prose, recomputes the decorations, and
										// replaces the button between mousedown and mouseup — so
										// the click never lands.
										stopEvent: () => true,
									},
								),
							]
						})

						return DecorationSet.create(state.doc, widgets)
					},
				},
			}),
		]
	},
})

function renderProposal(
	proposal: BreakProposal,
	view: EditorView,
	getPos: () => number | undefined,
): HTMLElement {
	const wrap = document.createElement('div')
	wrap.className =
		'my-4 flex items-center gap-2 border-y border-dashed border-accent-edge py-1.5'
	wrap.contentEditable = 'false'

	const label = document.createElement('span')
	label.className = 'label-meta text-accent-ink'
	label.textContent = 'proposed section break'

	const accept = document.createElement('button')
	accept.type = 'button'
	accept.className =
		'ml-auto rounded-md border border-accent-edge px-2 py-0.5 text-[0.75rem] text-accent-ink'
	accept.textContent = 'accept'
	// mousedown rather than click, for the same reason `stopEvent` is set.
	accept.addEventListener('mousedown', (event) => {
		event.preventDefault()

		const at = getPos()
		if (at === undefined) return

		view.dispatch(
			view.state.tr.insert(at, view.state.schema.nodes.horizontalRule.create()).setMeta(
				proposalsKey,
				(proposalsKey.getState(view.state) ?? []).filter(
					(other) => other.id !== proposal.id,
				),
			),
		)
	})

	wrap.append(label, accept)
	return wrap
}
