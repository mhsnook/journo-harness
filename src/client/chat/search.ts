import { type DynamicToolUIPart, getToolName, type ToolUIPart } from 'ai'

import { webSearchOutput, webSearchTool } from '../../shared/chat'

/** Reading a search out of the transcript, for the line the Chat Panel shows.
 * The writer rules on nothing here. */

export type SearchCall = {
	/** Null while the model is still streaming the call. */
	query: string | null
	/** Null until the search comes back. */
	found: number | null
	failed: boolean
}

/** One search part read, or null for a part that is not one.
 *
 * The input is read field by field rather than through `webSearchInput`, which
 * would refuse the half-object a streaming call carries.
 */
export function readWebSearch(part: ToolUIPart | DynamicToolUIPart): SearchCall | null {
	if (getToolName(part) !== webSearchTool) return null

	const asked = part.input
	const query =
		typeof asked === 'object' && asked !== null && 'query' in asked
			? typeof asked.query === 'string' && asked.query !== ''
				? asked.query
				: null
			: null

	if (part.state === 'output-error') return { query, found: null, failed: true }
	if (part.state !== 'output-available') return { query, found: null, failed: false }

	// The tool never throws, so a failed search arrives as an ordinary output
	// saying so rather than as `output-error`.
	const answer = webSearchOutput.safeParse(part.output)
	if (!answer.success) return { query, found: null, failed: true }
	if (answer.data.status === 'unavailable') return { query, found: null, failed: true }

	return { query, found: answer.data.results.length, failed: false }
}
