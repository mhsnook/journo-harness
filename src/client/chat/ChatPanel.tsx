import { getToolName, isTextUIPart, isToolUIPart, type UIMessage } from 'ai'
import type { ReactNode } from 'react'

import { proposePlanChangeTool, recordOffersTool } from '../../shared/chat'
import type { Offer } from '../../shared/offer'
import type { Plan } from '../../shared/plan'
import { ChatComposer, ChatMessage, ChatNote } from '../components/Chat'
import { Notice } from '../components/Notice'
import { Panel } from '../components/Panel'
import { ReferenceCard } from '../components/ReferenceCard'
import { readRecordedOffers } from './offers'
import { ProposalCard } from './ProposalCard'
import { readProposal, type ProposalCall, type Refusals } from './proposals'

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
	/** How many tool calls are suspended. While this is not 0 the turn is parked. */
	waiting: number
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
		<Panel className={className} padded={false}>
			<div className="flex flex-1 flex-col gap-3.5 p-3.5">
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
				{failure === null ? null : <Notice>{failure}</Notice>}
			</div>

			{/* Sticky, because the Panel scrolls its own Y and a composer that
			    scrolled away with the transcript would be the one control on the
			    Panel you cannot reach. Full-bleed and owning its own padding, which
			    is how every other Panel edge is built. */}
			<div className="sticky bottom-0 z-10 border-t border-edge bg-surface px-3.5 py-2.5">
				<ChatComposer
					blocked={parked(waiting)}
					disabled={busy}
					leading={leading}
					onSend={onSend}
					placeholder={placeholder}
				/>
			</div>
		</Panel>
	)
}

/**
 * An abandoned tool batch parks indefinitely: Cloudflare's `ai-chat` enforces
 * batch completeness server-side with no orphan timeout (§11). This is the
 * sentence that says so, rather than a composer that quietly does nothing.
 */
function parked(waiting: number): string | null {
	if (waiting === 0) return null
	if (waiting === 1) {
		return 'The Chat is waiting on a Proposal. Accept or Decline it to carry on.'
	}

	return `The Chat is waiting on ${waiting} Proposals. Accept or Decline each one to carry on.`
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
							// Not `part.errorText`: that is the sentence written for the
							// model, ids and op name included. The writer read the reason on
							// the card before they ruled — §6.
							return <ChatNote key={key}>Proposal Declined.</ChatNote>
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
