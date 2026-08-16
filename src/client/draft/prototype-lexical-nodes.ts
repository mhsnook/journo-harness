import { MarkNode, type SerializedMarkNode } from '@lexical/mark'
import {
	HeadingNode,
	type HeadingTagType,
	type SerializedHeadingNode,
} from '@lexical/rich-text'
import {
	type EditorConfig,
	type LexicalNode,
	type NodeKey,
	ParagraphNode,
	type SerializedParagraphNode,
	type Spread,
} from 'lexical'

import { mintBlockId } from './prototype-blocks'

/**
 * PROTOTYPE — issue #14. Throwaway.
 *
 * Lexical's own node keys are per-session and are not serialised, so a Block
 * that has to keep one id across reloads needs a node class of its own. This is
 * the whole of what `UniqueID.configure({ attributeName })` does on TipTap, and
 * it has to be repeated per node type.
 */

export type SerializedIdParagraph = Spread<{ blockId: string }, SerializedParagraphNode>
export type SerializedIdHeading = Spread<{ blockId: string }, SerializedHeadingNode>

export class IdParagraphNode extends ParagraphNode {
	__blockId: string

	constructor(blockId?: string, key?: NodeKey) {
		super(key)
		this.__blockId = blockId ?? mintBlockId()
	}

	static getType(): string {
		return 'id-paragraph'
	}

	// Lexical clones a node on every mutation, so the id has to ride across or a
	// Block loses its identity the first time the writer types in it.
	static clone(node: IdParagraphNode): IdParagraphNode {
		return new IdParagraphNode(node.__blockId, node.__key)
	}

	getBlockId(): string {
		return this.getLatest().__blockId
	}

	createDOM(config: EditorConfig): HTMLElement {
		const dom = super.createDOM(config)
		dom.setAttribute('data-block-id', this.__blockId)
		return dom
	}

	updateDOM(prev: IdParagraphNode, dom: HTMLElement, config: EditorConfig): boolean {
		if (prev.__blockId !== this.__blockId) {
			dom.setAttribute('data-block-id', this.__blockId)
		}
		return super.updateDOM(prev, dom, config)
	}

	static importJSON(json: SerializedIdParagraph): IdParagraphNode {
		return new IdParagraphNode(json.blockId).updateFromJSON(json)
	}

	exportJSON(): SerializedIdParagraph {
		return { ...super.exportJSON(), blockId: this.__blockId }
	}
}

export class IdHeadingNode extends HeadingNode {
	__blockId: string

	constructor(tag?: HeadingTagType, blockId?: string, key?: NodeKey) {
		super(tag ?? 'h2', key)
		this.__blockId = blockId ?? mintBlockId()
	}

	static getType(): string {
		return 'id-heading'
	}

	static clone(node: IdHeadingNode): IdHeadingNode {
		return new IdHeadingNode(node.__tag, node.__blockId, node.__key)
	}

	getBlockId(): string {
		return this.getLatest().__blockId
	}

	createDOM(config: EditorConfig): HTMLElement {
		const dom = super.createDOM(config)
		dom.setAttribute('data-block-id', this.__blockId)
		return dom
	}

	updateDOM(prev: this, dom: HTMLElement, config: EditorConfig): boolean {
		if (prev.__blockId !== this.__blockId) {
			dom.setAttribute('data-block-id', this.__blockId)
		}
		return super.updateDOM(prev, dom, config)
	}

	static importJSON(json: SerializedIdHeading): IdHeadingNode {
		const node: IdHeadingNode = new IdHeadingNode(json.tag, json.blockId)
		return node.updateFromJSON(json)
	}

	exportJSON(): SerializedIdHeading {
		return { ...super.exportJSON(), blockId: this.__blockId }
	}
}

export function $isIdBlock(node: LexicalNode | null | undefined): boolean {
	return node instanceof IdParagraphNode || node instanceof IdHeadingNode
}

/**
 * `MarkNode` renders a bare `<mark>` and puts its ids nowhere in the DOM, so a
 * third node class exists only to write the attribute that the margin notes are
 * measured against. TipTap declared the same thing inline on the mark.
 */
export class CommentMarkNode extends MarkNode {
	static getType(): string {
		return 'comment-mark'
	}

	static clone(node: CommentMarkNode): CommentMarkNode {
		return new CommentMarkNode([...node.getIDs()], node.__key)
	}

	createDOM(config: EditorConfig): HTMLElement {
		const dom = super.createDOM(config)
		dom.setAttribute('data-comment-id', this.getIDs()[0] ?? '')
		dom.className = 'rounded-sm bg-accent-soft underline decoration-accent-edge'
		return dom
	}

	static importJSON(json: SerializedMarkNode): CommentMarkNode {
		const node: CommentMarkNode = new CommentMarkNode(json.ids)
		return node.updateFromJSON(json)
	}
}
