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
 * One Chat, on the socket the Plan already holds — docs/architecture.md §6 and
 * §8. The Chat proposes and the client applies: Accepting runs the Proposal's
 * ops through the Plan's one writer, which is the same `edit` every Plan change
 * makes, and then answers the tool call.
 *
 * Three API details this leans on, each easy to get wrong:
 *
 * - `addToolOutput`, not the deprecated `addToolResult`, and **never awaited** —
 *   the AI SDK docs warn twice about deadlock.
 * - A Decline answers with `is_error: true`, which is `state: 'output-error'`
 *   plus the reason in `errorText`.
 * - `addToolApprovalResponse` and `needsApproval` are for a server-side
 *   `execute` this product does not have (§6). Both rulings go through
 *   `addToolOutput`.
 */

export type ChatHandle = {
	messages: UIMessage[]
	/** A turn is in flight, whether the writer started it or the server did. */
	busy: boolean
	/** How many tool calls are suspended. While this is not 0 the turn is parked
	 * and the composer says so — §11. */
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

	// The turn is about the Plan the writer is looking at, which the body carries
	// because `body` is request-only where `metadata` re-rides every turn (§6).
	// Held in a ref because the body is built when the turn is sent, not when
	// this renders.
	const held = useRef<Plan | null>(connection.plan)
	useEffect(() => {
		held.current = connection.plan
	})

	const chat = useAgentChat({
		agent,
		body: () => (held.current === null ? {} : { plan: held.current }),
	})

	const { messages, addToolOutput } = chat

	// A research turn writes rows this client never asked for, and nothing on the
	// socket announces a row — §3. The ids the transcript names are what says the
	// set moved.
	//
	// The first set it names is skipped: that is the persisted transcript
	// arriving, and the Ledger's own read on mount already covers those rows. Only
	// a turn that records something after that is worth a second RPC.
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
		// Through the Plan's one writer, like every other Plan edit: it holds the
		// Plan the writer sees, debounces, and refuses an update over an unsent
		// write. A second writer around it would undo what is on screen — §3.
		const ruling = ruleProposal({
			call,
			accepted,
			edit: connection.edit,
			refusal: refusals[call.toolCallId] ?? null,
		})

		setRefusals((was) => afterRuling(was, call.toolCallId, ruling.refusal))
		if (ruling.answer === null) return

		// No await. The AI SDK docs warn twice about deadlock.
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
