/** `useArticleAgent` owns the one `onMessage` handler and parses each frame here
 * once, because a streamed Chat reply is hundreds of frames and two readers
 * would parse every one of them twice. */

/** Frames a reader does not want are ordinary, and a binary one is not JSON. */
export function parseFrame(data: unknown): unknown {
	if (typeof data !== 'string') return null

	try {
		return JSON.parse(data)
	} catch {
		return null
	}
}
