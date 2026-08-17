/**
 * The Article Agent's socket is multiplexed (§8), and most of what rides it is
 * the Agents SDK's own control traffic. Two frames are ours: a refused Plan
 * write, and a Review settling.
 *
 * `useArticleAgent` owns the one `onMessage` handler, parses each frame here
 * once, and hands the result to both readers — a chat stream is hundreds of
 * frames, so parsing per reader would parse the same string twice for every one
 * of them.
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
