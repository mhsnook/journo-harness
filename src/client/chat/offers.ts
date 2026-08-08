import {
	type DynamicToolUIPart,
	getToolName,
	isToolUIPart,
	type ToolUIPart,
	type UIMessage,
} from 'ai'

import {
	type RecordedOffers,
	recordedOffersOutput,
	recordOffersTool,
} from '../../shared/chat'

/**
 * Reading a research turn's result out of the transcript. `recordOffers`
 * resolves server-side and hands back ids, not rows — §5.
 */

/** What one `recordOffers` call turned up, or null for a part that is not one. */
export function readRecordedOffers(
	part: ToolUIPart | DynamicToolUIPart,
): RecordedOffers | null {
	if (getToolName(part) !== recordOffersTool) return null
	if (part.state !== 'output-available') return null

	const parsed = recordedOffersOutput.safeParse(part.output)

	return parsed.success ? parsed.data : null
}

/** A fresh array of every Offer id the transcript names, in order, deduped. */
export function recordedOfferIds(messages: readonly UIMessage[]): string[] {
	const ids: string[] = []

	for (const message of messages) {
		for (const part of message.parts) {
			if (!isToolUIPart(part)) continue

			for (const recorded of readRecordedOffers(part) ?? []) {
				if (!ids.includes(recorded.id)) ids.push(recorded.id)
			}
		}
	}

	return ids
}
