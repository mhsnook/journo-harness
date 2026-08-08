import type { UIMessage } from 'ai'

/**
 * Building a transcript by hand, for the tests that read one.
 *
 * The cast is the point of sharing this: a tool part is a union over its
 * states, and a fixture states one state's fields against the whole union. One
 * cast in one place is one thing to fix when the SDK moves the union.
 */

export function toolPart(
	toolName: string,
	state: string,
	extra: Record<string, unknown> = {},
): UIMessage['parts'][number] {
	return {
		type: `tool-${toolName}`,
		toolCallId: 'call-1',
		state,
		...extra,
	} as UIMessage['parts'][number]
}

/** One assistant turn carrying the parts given. */
export function transcript(...parts: UIMessage['parts']): UIMessage[] {
	return [{ id: 'm-1', role: 'assistant', parts }]
}
