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
 * Reading a research turn's result out of the transcript. The `recordOffers`
 * tool carries an `execute` and resolves inside the Article Agent (§5), so
 * nothing here rules on it — what it hands back is a list of ids, and the Chat
 * Panel shows the rows the Offer ledger holds for them.
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

/**
 * Every Offer id the transcript names, in order. The Ledger reads its rows once
 * when it opens, because nothing tells a client a row changed — so a turn that
 * recorded some is what tells it to read again, and this is the key that says
 * the set moved.
 */
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
