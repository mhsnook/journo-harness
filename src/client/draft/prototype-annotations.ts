import { Extension, Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'

/**
 * PROTOTYPE — issue #14. Throwaway.
 *
 * The two ways something can sit over the Draft without being prose, and the
 * line between them:
 *
 * - A **Proposal** is a decoration. It is not in the document, so it does not
 *   sync, does not reach the Final, and dies with the Block it points at.
 * - An **accepted annotation** is a mark. It is in the document, so it rides in
 *   the Block's stored content and survives the writer rewriting around it in a
 *   session that never rendered it.
 *
 * Accepting a Proposal is the moment the first becomes the second.
 */

/**
 * A comment's anchor, stored in the prose itself.
 *
 * A decoration cannot do this job: the writer can rewrite the paragraph while
 * the Notes Panel is closed, and only a mark moves with the text as a property
 * of the document rather than of the view. The comment's body lives in the
 * Article Agent's SQLite (#11); this is the end that has to survive editing.
 *
 * `inclusive: false` so typing immediately after a commented phrase writes
 * outside the comment rather than silently extending it.
 */
export const CommentMark = Mark.create({
	name: 'comment',
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

/** A section break the Guide suggests, which the writer has not accepted. */
export interface BreakProposal {
	id: string
	/** Drawn immediately before this Block. */
	beforeBlockId: string
}

export const proposalsKey = new PluginKey<BreakProposal[]>('prototype-proposals')

/**
 * Draws each Proposal as a widget decoration — a DOM node at a position the
 * document does not contain. Nothing here touches the doc, which is the whole
 * point: the row readout beside it never shows a Proposal.
 */
export const ProposedBreaks = Extension.create({
	name: 'proposedBreaks',

	addProseMirrorPlugins() {
		return [
			new Plugin<BreakProposal[]>({
				key: proposalsKey,

				state: {
					init: () => [],
					apply(tr, current) {
						const next = tr.getMeta(proposalsKey) as BreakProposal[] | undefined
						return next ?? current
					},
				},

				props: {
					decorations(state) {
						const proposals = proposalsKey.getState(state) ?? []
						if (proposals.length === 0) return DecorationSet.empty

						const at = new Map<string, number>()
						state.doc.descendants((node, pos) => {
							const id = node.attrs['block-id'] as string | undefined
							if (id !== undefined && id !== null) at.set(id, pos)
							return false
						})

						const widgets = proposals.flatMap((proposal) => {
							const pos = at.get(proposal.beforeBlockId)
							if (pos === undefined) return []

							return [
								Decoration.widget(
									pos,
									// The factory is handed the view and a live position, so
									// accepting needs nothing from React — which also keeps the
									// handler off the first render's stale closure.
									(view, getPos) => renderProposal(proposal, view, getPos),
									{
										side: -1,
										// Keeps the widget out of the text the editor reports, so
										// copying the Draft never picks a Proposal up.
										ignoreSelection: true,
										// Without this the editor treats a press on the widget as a
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

/** Built by hand rather than in React: a widget owns raw DOM. */
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
	accept.addEventListener('mousedown', (event) => {
		event.preventDefault()

		// One transaction: the break becomes a real node, and the Proposal that
		// offered it stops existing. Before this click the rows knew nothing
		// about it; after it, the break is a Block like any other.
		const at = getPos()
		if (at === undefined) return

		const rule = view.state.schema.nodes.horizontalRule
		const held = proposalsKey.getState(view.state) ?? []

		view.dispatch(
			view.state.tr.insert(at, rule.create()).setMeta(
				proposalsKey,
				held.filter((other) => other.id !== proposal.id),
			),
		)
	})

	wrap.append(label, accept)
	return wrap
}
