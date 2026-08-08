import type { UIMessage } from 'ai'

/**
 * Building a transcript by hand. Shared for the cast: a tool part is a union
 * over its states and a fixture writes one state's fields, so this is the one
 * place to fix when the SDK moves that union.
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
