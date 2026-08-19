import { reasonFor } from '../../shared/failure'

export { reasonFor }

/** The reason with what went wrong in front of it, and null where nothing did. */
export function failureText(what: string, error: unknown): string | null {
	if (error === null || error === undefined) return null

	return `${what} ${reasonFor(error)}`
}
