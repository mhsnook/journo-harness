import { useAgentChat } from '@cloudflare/ai-chat/react'
import type { UIMessage } from 'ai'
import { useEffect, useRef, useState } from 'react'

import { proposePlanChangeTool } from '../../shared/chat'
import type { Plan } from '../../shared/plan'
import { useArticle } from '../lib/article'
import type { ArticleSocket } from '../lib/useArticleAgent'
import { useOfferLedger, type OfferLedgerHandle } from '../lib/useOfferLedger'
import { recordedOfferIds } from './offers'
import {
	afterRuling,
	type ProposalCall,
	type Refusals,
	ruleProposal,
	waitingCount,
} from './proposals'

/**
 * One Chat on the socket the Plan already holds — §6 and §8. A ruling applies
 * the ops through `edit` and then answers the tool call.
 *
 * Three SDK traps sit under this. `addToolResult` is deprecated in favour of
 * `addToolOutput`, and awaiting either deadlocks. A rejection is
 * `state: 'output-error'` with the reason in `errorText`. And
 * `addToolApprovalResponse` and `needsApproval` gate a server-side `execute`
 * this product does not have, so both rulings go out as tool output.
 */

export type ChatHandle = {
	messages: UIMessage[]
	/** A turn is in flight, whether the writer started it or the server did. */
	busy: boolean
	/** Suspended tool calls; above zero the turn is parked — §11. */
	waiting: number
	/** Why an Accept did not land, by tool call id. */
	refusals: Refusals
	/** The Offers the turns in this transcript recorded. */
	ledger: OfferLedgerHandle
	send: (text: string) => void
	accept: (call: ProposalCall) => void
	decline: (call: ProposalCall) => void
	/** The connection or the turn failed, in one sentence. */
	failure: string | null
}

export function useArticleChat(agent: ArticleSocket): ChatHandle {
	const { plan: connection } = useArticle()
	const ledger = useOfferLedger()
	const [refusals, setRefusals] = useState<Refusals>({})

	// A ref, because the body is built when the turn is sent rather than when
	// this renders. The Plan goes in `body` and not `metadata` — §6.
	const held = useRef<Plan | null>(connection.plan)
	useEffect(() => {
		held.current = connection.plan
	})

	const chat = useAgentChat({
		agent,
		body: () => (held.current === null ? {} : { plan: held.current }),
	})

	const { messages, addToolOutput } = chat

	// Nothing on the socket announces a new Offer row (§3), so a turn naming ids
	// the Ledger has not seen is the signal to read again. The first set is the
	// persisted transcript landing, which the Ledger's own read already covers.
	const recorded = recordedOfferIds(messages).join(' ')
	const seen = useRef<string | null>(null)
	const { reload } = ledger
	useEffect(() => {
		if (recorded === '') return

		const first = seen.current === null
		seen.current = recorded
		if (!first) reload()
	}, [recorded, reload])

	const rule = (call: ProposalCall, accepted: boolean) => {
		const ruling = ruleProposal({
			call,
			accepted,
			edit: connection.edit,
			refusal: refusals[call.toolCallId] ?? null,
		})

		setRefusals((was) => afterRuling(was, call.toolCallId, ruling.refusal))
		if (ruling.answer === null) return

		// Awaiting this deadlocks.
		addToolOutput({
			toolCallId: call.toolCallId,
			toolName: proposePlanChangeTool,
			...('output' in ruling.answer
				? { output: ruling.answer.output }
				: { state: 'output-error' as const, errorText: ruling.answer.errorText }),
		})
	}

	return {
		messages,
		send: (text: string) => {
			const said = text.trim()
			if (said !== '') chat.sendMessage({ text: said })
		},
		accept: (call: ProposalCall) => rule(call, true),
		decline: (call: ProposalCall) => rule(call, false),
		busy: chat.isStreaming || chat.isRecovering || chat.status === 'submitted',
		waiting: waitingCount(messages),
		refusals,
		ledger,
		failure: chat.error?.message ?? chat.connectionError?.message ?? null,
	}
}
