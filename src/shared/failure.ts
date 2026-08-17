/** What a caught error reads as. Both sides catch: the client shows it, and the
 * Article Agent stores it on a row. */
export function reasonFor(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}
