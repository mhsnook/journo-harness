import { getToolName, isTextUIPart, isToolUIPart, type UIMessage } from 'ai'
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'

import { proposePlanChangeTool, recordOffersTool } from '../../shared/chat'
import type { Offer } from '../../shared/offer'
import type { Plan } from '../../shared/plan'
import { ChatComposer, ChatMessage, ChatNote, ChatWorking } from '../components/Chat'
import { Notice } from '../components/Notice'
import { Panel, type PanelProps } from '../components/Panel'
import { ReferenceCard } from '../components/ReferenceCard'
import { readRecordedOffers } from './offers'
import { ProposalCard } from './ProposalCard'
import { readProposal, type ProposalCall, type Refusals } from './proposals'

/**
 * The Chat Panel takes a transcript & rulings; `ArticleChatPanel` drives it from
 * the Article Agent — the same split as `PlanPanel` and `ArticlePlanPanel`. A turn
 * can return Proposals and Offers; each gets its own card. Proposals suspend and
 * wait for the writer (§6), but Offers just accumulate in the Ledger.
 */

export interface ChatPanelProps {
	messages: readonly UIMessage[]
	/** What a Proposal card names its Sections and References out of. */
	plan: Plan
	/** A turn is in flight and the guide is the one working. False while a
	 * Proposal is parked: the turn is open, but it is the writer's move. */
	busy: boolean
	/** Cancels the turn. */
	onStop?: () => void
	/** Proposals nobody has ruled on; above zero the turn is parked — §11. */
	waiting: number
	refusals: Refusals
	offers: readonly Offer[]
	onSend: (text: string) => void
	onAccept: (call: ProposalCall) => void
	onDecline: (call: ProposalCall) => void
	onAcceptOffer: (offer: Offer) => void
	onDeclineOffer: (offer: Offer) => void
	failure?: string | null
	/** The rule between this Panel and its neighbour. */
	divider?: PanelProps['divider']
	placeholder?: string
	/** Left of send — the Offer ledger toggle. */
	leading?: ReactNode
	/** A layer over the transcript, stopping at the top of the composer. The
	 * Offer ledger is the one of these. */
	drawer?: ReactNode
	className?: string
}

export function ChatPanel({
	messages,
	plan,
	busy,
	onStop,
	waiting,
	refusals,
	offers,
	onSend,
	onAccept,
	onDecline,
	onAcceptOffer,
	onDeclineOffer,
	failure = null,
	divider,
	placeholder,
	leading,
	drawer,
	className,
}: ChatPanelProps) {
	const rows = new Map(offers.map((offer) => [offer.id, offer]))
	const transcript = useFootOfTranscript()

	return (
		<Panel className={className} divider={divider} padded={false}>
			{/* The transcript and the drawer share this box, so the drawer covers
			    what the writer is reading and stops at the composer. `overflow-hidden`
			    is what makes the drawer slide out of sight behind it. */}
			<div className="relative flex min-h-0 flex-1 overflow-hidden">
				<div
					data-scroller=""
					className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-3.5"
					onScroll={transcript.onScroll}
					ref={transcript.ref}
				>
					{messages.map((message) => (
						<Turn
							key={message.id}
							message={message}
							onAccept={onAccept}
							onAcceptOffer={onAcceptOffer}
							onDecline={onDecline}
							onDeclineOffer={onDeclineOffer}
							plan={plan}
							refusals={refusals}
							rows={rows}
						/>
					))}

					{messages.length === 0 ? (
						<ChatNote>
							Say what the piece is about. The Plan fills in beside you as you agree on
							it.
						</ChatNote>
					) : null}

					{busy ? <ChatWorking>The guide is answering…</ChatWorking> : null}
					{failure === null ? null : <Notice>{failure}</Notice>}
				</div>
				{drawer}
			</div>

			<div className="shrink-0 border-t border-edge bg-surface px-3.5 py-2.5">
				<ChatComposer
					blocked={parked(waiting)}
					busy={busy}
					leading={leading}
					onSend={onSend}
					onStop={onStop}
					placeholder={placeholder}
				/>
			</div>
		</Panel>
	)
}

/** Scroll positions round, so the bottom is rarely exactly the bottom. */
const AT_THE_FOOT = 24

/**
 * Keeps the Chat pinned to the bottom as messages stream in. Releases when the
 * writer scrolls up more than 24px, and re-takes when they scroll back down.
 *
 * Returns the ref for the scrolling element and the `onScroll` that tracks it.
 */
function useFootOfTranscript() {
	const panel = useRef<HTMLDivElement>(null)
	const pinned = useRef(true)

	const foot = () => {
		if (panel.current !== null && pinned.current) {
			panel.current.scrollTop = panel.current.scrollHeight
		}
	}

	// Before first paint, since the observer below is attached after it.
	useLayoutEffect(foot, [])

	useEffect(() => {
		const scroller = panel.current
		if (scroller === null) return

		// The children grow as turns arrive; the scroller itself changes height
		// when the window does, or when the composer grows under it.
		const watch = new ResizeObserver(foot)
		watch.observe(scroller)
		for (const child of scroller.children) watch.observe(child)

		return () => watch.disconnect()
		// `foot` reads refs alone, so it cannot go stale.
	}, [])

	return {
		ref: panel,
		onScroll: () => {
			const scroller = panel.current
			if (scroller === null) return

			pinned.current =
				scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= AT_THE_FOOT
		},
	}
}

/** Why the composer will not send, and null when it will. Nothing expires an
 * unruled call, so the writer has to be told to go and rule on it — §11. */
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
