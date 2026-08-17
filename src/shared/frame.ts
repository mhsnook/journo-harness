/**
 * The frames that reach a client unasked.
 *
 * The Article Agent's socket is multiplexed (§8), and most of what rides it is
 * the Agents SDK's own control traffic. Two things are ours: a refused Plan
 * write, and a Review settling. Both arrive as frames the SDK does not
 * recognise, and both are told apart by one string.
 *
 * One guard rather than one per frame — every version of it is the same three
 * checks, and writing them again per frame type is how the third one ends up
 * subtly different from the first two.
 */

/** Narrows an unknown frame to the one named. The frame type is stated by the
 * caller, because only the caller knows what `type` implies about the rest. */
export function isFrame<F extends { type: string }>(
	frame: unknown,
	type: F['type'],
): frame is F {
	return (
		typeof frame === 'object' &&
		frame !== null &&
		(frame as { type?: unknown }).type === type
	)
}
