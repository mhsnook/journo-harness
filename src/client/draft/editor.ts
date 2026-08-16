import { getSchema } from '@tiptap/core'
import UniqueID from '@tiptap/extension-unique-id'
import StarterKit from '@tiptap/starter-kit'

import { CommentMark, ProposedBreaks } from './annotations'
import { BLOCK_ID_ATTR, mintBlockId, topLevelTypes } from './blocks'

/**
 * `CommentMark` and `ProposedBreaks` are registered before anything creates
 * one: the schema has to know a mark exists for stored content carrying it to
 * parse, and content holding a mark the schema does not know is dropped
 * silently, so registering it later means the Drafts written in between cannot
 * be read back.
 */
const content = [StarterKit, CommentMark, ProposedBreaks]

/**
 * Every node type that can be a Block, taken from the schema those extensions
 * build rather than listed by hand. `UniqueID` is configured from it and is
 * therefore left out of the schema it is derived from — it adds an attribute,
 * never a node type.
 */
export const BLOCK_TYPES = topLevelTypes(getSchema(content))

/**
 * The Draft's editor, in one place so a test and a future server-side read
 * build the same document as the Panel does.
 */
export const draftExtensions = [
	...content,
	UniqueID.configure({
		// Renders as `data-block-id`.
		attributeName: BLOCK_ID_ATTR,
		types: BLOCK_TYPES,
		generateID: mintBlockId,
	}),
]
