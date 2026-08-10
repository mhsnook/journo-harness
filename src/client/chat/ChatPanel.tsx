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
	className,
}: ChatPanelProps) {
	const rows = new Map(offers.map((offer) => [offer.id, offer]))
	const transcript = useFootOfTranscript()

	return (
		<Panel
			className={className}
			divider={divider}
			onScroll={transcript.onScroll}
			padded={false}
			ref={transcript.ref}
		>
			<div className="flex flex-1 flex-col gap-3.5 p-3.5">
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
						Say what the piece is about. The Plan fills in beside you as you agree on it.
					</ChatNote>
				) : null}

				{busy ? <ChatWorking>The guide is answering…</ChatWorking> : null}
				{failure === null ? null : <Notice>{failure}</Notice>}
			</div>

			<div className="sticky bottom-0 z-10 border-t border-edge bg-surface px-3.5 py-2.5">
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

/** How far off the foot still counts as being at it, in px. A rounded scroll
 * position lands a pixel or two short of the bottom on its own. */
const AT_THE_FOOT = 24

/**
 * The Chat opens on the last thing said, and stays there as a turn streams in.
 *
 * The writer scrolling up is what lets go of the foot: they are reading
 * something further back, and yanking them to the bottom mid-turn would take it
 * away. Scrolling back down takes hold again.
 *
 * **The observer is what holds it, and the render is only the first pin.**
 * Anything that can push the last turn out of view resizes a box the observer
 * watches — a streamed chunk grows the transcript, and pasting four paragraphs
 * grows the composer inside its own state, without this component rendering at
 * all. Re-pinning on every render would read `scrollHeight` once per streamed
 * chunk, which forces a layout pass, and catch nothing the observer misses.
 */
function useFootOfTranscript() {
	const panel = useRef<HTMLElement>(null)
	const held = useRef(true)

	const foot = () => {
		if (panel.current !== null && held.current) {
			panel.current.scrollTop = panel.current.scrollHeight
		}
	}

	// The first pin, before paint. The observer below is attached in a passive
	// effect, which can land after the transcript has been shown from the top.
	useLayoutEffect(foot, [])

	useEffect(() => {
		const shown = panel.current
		if (shown === null) return

		// The Panel for its own height, which a shorter window changes without
		// reflowing anything inside it, and the children for theirs: the
		// transcript above and the composer below.
		const watch = new ResizeObserver(foot)
		watch.observe(shown)
		for (const child of shown.children) watch.observe(child)

		return () => watch.disconnect()
		// `foot` reads refs alone, so it has nothing to go stale against.
	}, [])

	return {
		ref: panel,
		onScroll: () => {
			const shown = panel.current
			if (shown === null) return

			held.current =
				shown.scrollHeight - shown.scrollTop - shown.clientHeight <= AT_THE_FOOT
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
