/**
 * The Article Agent's socket is multiplexed (§8), and two things on it reach a
 * client unasked: a refused Plan write, and a Review settling. Both arrive as
 * frames `useAgent` does not recognise and hands to `onMessage`.
 *
 * One `onMessage` handler exists, in `useArticleAgent`, so anything past the
 * Plan needs somewhere to be told. That is all this is.
 */

/** The socket carries frames a reader does not want, and a binary one is not
 * JSON at all. */
export function parseFrame(data: unknown): unknown {
	if (typeof data !== 'string') return null

	try {
		return JSON.parse(data)
	} catch {
		return null
	}
}

export type Listeners<T> = {
	/** Hands back the way to stop listening. */
	add: (listen: (value: T) => void) => () => void
	send: (value: T) => void
}

/** Built once per socket and kept for its life, so a Panel that mounts and
 * unmounts adds and removes rather than replacing anything. */
export function listeners<T>(): Listeners<T> {
	const held = new Set<(value: T) => void>()

	return {
		add: (listen) => {
			held.add(listen)

			return () => held.delete(listen)
		},
		send: (value) => held.forEach((listen) => listen(value)),
	}
}
