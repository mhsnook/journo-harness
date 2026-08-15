import { type DynamicToolUIPart, getToolName, type ToolUIPart } from 'ai'

import { webSearchOutput, webSearchTool } from '../../shared/chat'

/**
 * Reading a search out of the transcript. The writer rules on nothing here —
 * the Chat Panel shows what the guide looked up so a turn that searches reads
 * as working rather than as stalled.
 */

/** What the transcript says about one search. `query` is absent while the
 * model is still streaming the call. */
export type SearchCall = {
	query: string | null
	/** Absent until the search comes back. */
	found: number | null
	failed: boolean
}

/** One search part read, or null for a part that is not one.
 *
 * The input is read field by field rather than through `webSearchInput`: a call
 * still streaming carries half an object, and the query is worth showing the
 * moment it arrives rather than once the whole call parses.
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

	// The tool never throws, so a search that failed arrives here as an ordinary
	// output saying it did — `src/server/llm/search.ts`.
	const answer = webSearchOutput.safeParse(part.output)
	if (!answer.success) return { query, found: null, failed: true }
	if (answer.data.status === 'unavailable') return { query, found: null, failed: true }

	return { query, found: answer.data.results.length, failed: false }
}
