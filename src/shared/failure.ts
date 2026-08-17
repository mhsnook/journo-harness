/**
 * What a caught error reads as.
 *
 * Anything may be thrown, and every reader of a failure — a Panel, a Round row,
 * a Chat turn's error channel — needs a sentence rather than an `unknown`. In
 * `src/shared` because both sides catch: the client shows it, and the Article
 * Agent stores it on the row the writer will come back to.
 */
export function reasonFor(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}
