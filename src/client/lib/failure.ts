/** What a caught error reads as on screen. Anything may be thrown, and a writer
 * mid-task should still get a sentence. */
export function reasonFor(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}

/** The same, with what went wrong in front of it, and null where nothing did. */
export function failureText(what: string, error: unknown): string | null {
	if (error === null || error === undefined) return null

	return `${what} ${reasonFor(error)}`
}
