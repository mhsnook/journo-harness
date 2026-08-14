import UniqueID from '@tiptap/extension-unique-id'
import StarterKit from '@tiptap/starter-kit'

import { CommentMark, ProposedBreaks } from './annotations'
import { BLOCK_TYPES, mintBlockId } from './blocks'

/**
 * The Draft's editor, in one place so a test and a future server-side read
 * build the same document as the Panel does.
 *
 * `CommentMark` and `ProposedBreaks` are registered before anything creates
 * one: the schema has to know a mark exists for stored content carrying it to
 * parse, and a schema that changes after Blocks are stored cannot read them.
 */
export const draftExtensions = [
	StarterKit,
	UniqueID.configure({
		// Renders as `data-block-id`.
		attributeName: 'block-id',
		types: [...BLOCK_TYPES],
		generateID: mintBlockId,
	}),
	CommentMark,
	ProposedBreaks,
]
