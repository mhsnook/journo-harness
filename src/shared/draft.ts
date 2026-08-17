import { z } from 'zod'

/**
 * The Draft — context.md. One row per Block, meaning per paragraph, ordered by
 * a fractional index so inserting between two Blocks renumbers neither.
 *
 * A Block's content is the editor's own JSON, carried as an opaque object —
 * docs/adr/0003 for why, and for what changing editor would then cost.
 */

/** One Block's content, as the editor serialises it. */
export type BlockJson = { type: string } & Record<string, unknown>

/** One Block row. */
export type BlockRow = {
	id: string
	/** Fractional index. Carried across edits so an insert renumbers nothing. */
	ord: number
	json: BlockJson
}

/**
 * What one save carries. A delta rather than the whole Draft, so a client can
 * only ever remove a Block it has already seen — a second tab's paragraph is
 * not deletable by a client that has never heard of it.
 */
export type DraftChange = {
	blocks: BlockRow[]
	removed: string[]
}

/** What the Article Agent answers a save with. The rows are not echoed: the
 * client already holds them, and the editor owns the text either way. */
export type DraftSaved = {
	savedAt: number
	written: number
	removed: number
}

export const blockRowSchema = z.strictObject({
	id: z.string().min(1),
	// `JSON.stringify(NaN)` is `null`, so an ord that went wrong arrives as null
	// and is refused here rather than sorting arbitrarily on the next load.
	ord: z.number().finite(),
	// Loose, because the shape belongs to the editor. Only the discriminator the
	// document format guarantees is required.
	json: z.looseObject({ type: z.string().min(1) }),
})

export const draftChangeSchema = z.strictObject({
	blocks: z.array(blockRowSchema),
	removed: z.array(z.string().min(1)),
})

/** A Durable Object caps a row at 2 MB, and one pasted data-url reaches it. The
 * client cannot see this failure, so the Article Agent is where it is caught. */
export const MAX_BLOCK_BYTES = 64 * 1024
export const MAX_CHANGE_BYTES = 1024 * 1024

/** Shared, so the Agent and the in-memory store word these the same. */
export function blockTooLarge(id: string, bytes: number): Error {
	return new Error(
		`Block ${id} is ${bytes} bytes, over the ${MAX_BLOCK_BYTES}-byte limit for one Block.`,
	)
}

export function draftChangeTooLarge(bytes: number): Error {
	return new Error(
		`That save is ${bytes} bytes, over the ${MAX_CHANGE_BYTES}-byte limit for one write.`,
	)
}

/** Refuses a change no row store should be asked to write. Shared so the size
 * rule is stated once and the same sentence reaches the writer either way. */
export function checkChangeSize(change: DraftChange): void {
	let totalBytes = 0

	for (const block of change.blocks) {
		const blockBytes = JSON.stringify(block.json).length
		if (blockBytes > MAX_BLOCK_BYTES) throw blockTooLarge(block.id, blockBytes)
		totalBytes += blockBytes
	}

	if (totalBytes > MAX_CHANGE_BYTES) throw draftChangeTooLarge(totalBytes)
}
