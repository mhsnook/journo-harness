import { isToolUIPart, type UIMessage } from 'ai'
import { useState } from 'react'

import type { ChatPanelProps } from '../../src/client/chat/ChatPanel'
import {
	afterRuling,
	type ProposalCall,
	type Refusals,
	ruleProposal,
	type ToolAnswer,
	waitingCount,
} from '../../src/client/chat/proposals'
import { useArticle } from '../../src/client/lib/article'
import { useOfferLedger } from '../../src/client/lib/useOfferLedger'

/**
 * A Chat held in memory, so a story runs the real applier and the real Offer
 * ledger without a Worker. Rules through `ruleProposal` and stands in for the
 * SDK's `addToolOutput`. No model, so a turn the writer sends gets a flat
 * sentence back.
 */

export type MockChat = Omit<ChatPanelProps, 'plan' | 'className' | 'leading'>

export function useMockChat(start: UIMessage[]): MockChat {
	const { plan: connection } = useArticle()
	const ledger = useOfferLedger()
	const [messages, setMessages] = useState<UIMessage[]>(() => structuredClone(start))
	const [refusals, setRefusals] = useState<Refusals>({})

	const answer = (toolCallId: string, sent: ToolAnswer) =>
		setMessages((held) =>
			held.map((message) => ({
				...message,
				parts: message.parts.map((part) => {
					if (!isToolUIPart(part) || part.toolCallId !== toolCallId) return part

					// A tool part is a union over its states, so spreading one widens
					// the fields the answered state needs — hence the cast.
					const answered =
						'output' in sent
							? { ...part, state: 'output-available', output: sent.output }
							: { ...part, state: 'output-error', errorText: sent.errorText }

					return answered as unknown as typeof part
				}),
			})),
		)

	const rule = (call: ProposalCall, accepted: boolean) => {
		const ruling = ruleProposal({
			call,
			accepted,
			edit: connection.edit,
			refusal: refusals[call.toolCallId] ?? null,
		})

		setRefusals((was) => afterRuling(was, call.toolCallId, ruling.refusal))
		if (ruling.answer !== null) answer(call.toolCallId, ruling.answer)
	}

	return {
		messages,
		busy: false,
		waiting: waitingCount(messages),
		refusals,
		offers: ledger.ledger.offers,
		failure: ledger.failure,
		onAccept: (call) => rule(call, true),
		onDecline: (call) => rule(call, false),
		onAcceptOffer: ledger.accept,
		onDeclineOffer: ledger.decline,
		onSend: (text) =>
			setMessages((held) => [
				...held,
				{ id: `said-${held.length}`, role: 'user', parts: [{ type: 'text', text }] },
				{
					id: `back-${held.length}`,
					role: 'assistant',
					parts: [
						{
							type: 'text',
							text: 'This screen runs the Plan and the Offer ledger for real, and no model. Accept or Decline the Proposal above to see the Plan move.',
						},
					],
				},
			]),
	}
}
