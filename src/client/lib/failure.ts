import { reasonFor } from '../../shared/failure'

/** What a failure reads as on screen. `reasonFor` is shared, because the Article
 * Agent words a stored failure the same way — src/shared/failure.ts. */
export { reasonFor }

/** The reason with what went wrong in front of it, and null where nothing did. */
export function failureText(what: string, error: unknown): string | null {
	if (error === null || error === undefined) return null

	return `${what} ${reasonFor(error)}`
}
