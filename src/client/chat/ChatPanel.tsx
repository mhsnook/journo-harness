import { getToolName, isTextUIPart, isToolUIPart, type UIMessage } from 'ai'
import type { ReactNode } from 'react'

import { proposePlanChangeTool, recordOffersTool } from '../../shared/chat'
import type { Offer } from '../../shared/offer'
import type { Plan } from '../../shared/plan'
import { ChatComposer, ChatMessage, ChatNote } from '../components/Chat'
import { Panel } from '../components/Panel'
import { ReferenceCard } from '../components/ReferenceCard'
import { cx } from '../lib/cx'
import { readRecordedOffers } from './offers'
import { ProposalCard } from './ProposalCard'
import {
	readProposal,
	type ProposalCall,
	type Refusals,
	type WaitingCall,
} from './proposals'

/**
 * The Chat Panel. It takes a transcript and the rulings the writer can make on
 * it, so a story drives it from a fixture and `ArticleChatPanel` drives it from
 * the Article Agent — the same split as `PlanPanel` and `ArticlePlanPanel`.
 *
 * Two things a turn returns get their own card. A Proposal suspends and waits
 * for the writer (§6). Offers do not: `recordOffers` runs inside the Article
 * Agent, and what the turn hands back is a list of ids the Offer ledger holds
 * the rows for (§5).
 */

export interface ChatPanelProps {
	messages: readonly UIMessage[]
	/** The Plan a Proposal is described against, so a card names a Section the
	 * way the Outline does. */
	plan: Plan
	/** A turn is in flight. */
	busy: boolean
	/** Every suspended tool call. While this is not empty the turn is parked. */
	waiting: readonly WaitingCall[]
	/** Why an Accept did not land, by tool call id. */
	refusals: Refusals
	/** The Offer rows the recorded ids resolve to. */
	offers: readonly Offer[]
	onSend: (text: string) => void
	onAccept: (call: ProposalCall) => void
	onDecline: (call: ProposalCall) => void
	onAcceptOffer: (offer: Offer) => void
	onDeclineOffer: (offer: Offer) => void
	onRestoreOffer: (offer: Offer) => void
	/** The connection or the turn failed, in one sentence. */
	failure?: string | null
	placeholder?: string
	/** Left of send — the Offer ledger toggle. */
	leading?: ReactNode
	className?: string
}

export function ChatPanel({
	messages,
	plan,
	busy,
	waiting,
	refusals,
	offers,
	onSend,
	onAccept,
	onDecline,
	onAcceptOffer,
	onDeclineOffer,
	onRestoreOffer,
	failure = null,
	placeholder,
	leading,
	className,
}: ChatPanelProps) {
	const rows = new Map(offers.map((offer) => [offer.id, offer]))

	return (
		// `pb-0`, with the composer taking that padding instead: the Panel's own
		// bottom padding is inside the scrollport, so a card would scroll into it
		// and show under a composer that stopped short of it.
		<Panel className={cx('pb-0', className)}>
			{messages.map((message) => (
				<Turn
					key={message.id}
					message={message}
					onAccept={onAccept}
					onAcceptOffer={onAcceptOffer}
					onDecline={onDecline}
					onDeclineOffer={onDeclineOffer}
					onRestoreOffer={onRestoreOffer}
					plan={plan}
					refusals={refusals}
					rows={rows}
				/>
			))}

			{messages.length === 0 ? (
				<ChatNote>
					Say what the piece is about. The Plan fills in beside you as you agree on it.
				</ChatNote>
			) : null}

			{busy ? <ChatNote>The guide is answering…</ChatNote> : null}
			{failure === null ? null : (
				<p className="rounded-md border border-accent-edge bg-accent-soft p-2 text-[0.75rem] text-accent-ink">
					{failure}
				</p>
			)}

			<ChatComposer
				blocked={parked(waiting)}
				className="pb-3.5"
				disabled={busy}
				leading={leading}
				onSend={onSend}
				placeholder={placeholder}
			/>
		</Panel>
	)
}

/**
 * An abandoned tool batch parks indefinitely: Cloudflare's `ai-chat` enforces
 * batch completeness server-side with no orphan timeout (§11). This is the
 * sentence that says so, rather than a composer that quietly does nothing.
 */
function parked(waiting: readonly WaitingCall[]): string | null {
	if (waiting.length === 0) return null
	if (waiting.length === 1) {
		return 'The Chat is waiting on a Proposal. Accept or Decline it to carry on.'
	}

	return `The Chat is waiting on ${waiting.length} Proposals. Accept or Decline each one to carry on.`
}

type TurnProps = {
	message: UIMessage
	plan: Plan
	refusals: Refusals
	rows: Map<string, Offer>
	onAccept: (call: ProposalCall) => void
	onDecline: (call: ProposalCall) => void
	onAcceptOffer: (offer: Offer) => void
	onDeclineOffer: (offer: Offer) => void
	onRestoreOffer: (offer: Offer) => void
}

function Turn({
	message,
	plan,
	refusals,
	rows,
	onAccept,
	onDecline,
	onAcceptOffer,
	onDeclineOffer,
	onRestoreOffer,
}: TurnProps) {
	const from = message.role === 'user' ? 'me' : 'guide'

	return (
		<>
			{message.parts.map((part, index) => {
				const key = `${message.id}-${index}`

				if (isTextUIPart(part)) {
					if (part.text === '') return null

					return (
						<ChatMessage key={key} from={from}>
							{part.text}
						</ChatMessage>
					)
				}

				if (!isToolUIPart(part)) return null

				if (getToolName(part) === proposePlanChangeTool) {
					switch (part.state) {
						case 'input-streaming':
							return <ChatNote key={key}>Writing a Proposal…</ChatNote>
						case 'input-available': {
							const call = readProposal(part)

							return (
								<ProposalCard
									key={key}
									call={call}
									onAccept={() => onAccept(call)}
									onDecline={() => onDecline(call)}
									plan={plan}
									refusal={refusals[call.toolCallId] ?? null}
								/>
							)
						}
						case 'output-available':
							return <ChatNote key={key}>Proposal Accepted.</ChatNote>
						case 'output-error':
							return <ChatNote key={key}>Proposal Declined. {part.errorText}</ChatNote>
						default:
							return null
					}
				}

				if (getToolName(part) === recordOffersTool) {
					const recorded = readRecordedOffers(part)
					if (recorded === null) return <ChatNote key={key}>Looking things up…</ChatNote>

					const found = recorded
						.map(({ id }) => rows.get(id))
						.filter((offer): offer is Offer => offer !== undefined)

					return (
						<div key={key} className="flex flex-col gap-2">
							{found.map((offer) => (
								<ReferenceCard
									key={offer.id}
									offer={offer}
									onAccept={() => onAcceptOffer(offer)}
									onDecline={() => onDeclineOffer(offer)}
									onRestore={() => onRestoreOffer(offer)}
								/>
							))}
							{found.length < recorded.length ? (
								<ChatNote>
									{recorded.length} found, and the Offer ledger has not read them all back
									yet.
								</ChatNote>
							) : null}
						</div>
					)
				}

				return null
			})}
		</>
	)
}
