import { ListTodo } from 'lucide-react'
import { Activity, useState } from 'react'

import { Button } from '../components/Button'
import { Panel } from '../components/Panel'
import { useArticle } from '../lib/article'
import type { ArticleSocket } from '../lib/useArticleAgent'
import { ChatPanel, type ChatPanelProps } from './ChatPanel'
import { OfferLedgerPanel } from './OfferLedgerPanel'
import { useArticleChat } from './useArticleChat'

/** Drives `ChatPanel` from one Article Agent. Takes the socket rather than
 * opening one — §8. */

export interface ArticleChatPanelProps {
	agent: ArticleSocket
	placeholder?: string
	divider?: ChatPanelProps['divider']
	className?: string
}

export function ArticleChatPanel({
	agent,
	placeholder,
	divider,
	className,
}: ArticleChatPanelProps) {
	const { plan } = useArticle().plan
	const chat = useArticleChat(agent)
	const { ledger } = chat
	const [showLedger, setShowLedger] = useState(false)

	// A Proposal card names Sections out of the Plan, so there is nothing to draw
	// until one arrives.
	if (plan === null) {
		return (
			<Panel className={className} divider={divider}>
				<p className="text-[0.75rem] text-faint">Opening the Chat…</p>
			</Panel>
		)
	}

	// Hidden rather than swapped out, so a half-typed message survives a look at
	// the Ledger.
	return (
		<>
			<Activity mode={showLedger ? 'hidden' : 'visible'}>
				<ChatPanel
					busy={chat.busy}
					className={className}
					divider={divider}
					failure={chat.failure ?? ledger.failure}
					leading={
						<LedgerToggle
							onOpen={() => setShowLedger(true)}
							undecided={ledger.ledger.counts.undecided}
						/>
					}
					messages={chat.messages}
					offers={ledger.ledger.offers}
					onAccept={chat.accept}
					onAcceptOffer={ledger.accept}
					onDecline={chat.decline}
					onDeclineOffer={ledger.decline}
					onSend={chat.send}
					onStop={chat.stop}
					placeholder={placeholder}
					plan={plan}
					refusals={chat.refusals}
					waiting={chat.waiting}
				/>
			</Activity>
			<Activity mode={showLedger ? 'visible' : 'hidden'}>
				<OfferLedgerPanel
					className={className}
					divider={divider}
					ledger={ledger}
					onClose={() => setShowLedger(false)}
				/>
			</Activity>
		</>
	)
}

/** Opens the Offer ledger. Sits left of the composer. */
function LedgerToggle({ onOpen, undecided }: { onOpen: () => void; undecided: number }) {
	return (
		<Button
			aria-label={
				undecided === 0
					? 'Offer ledger'
					: `Offer ledger, ${undecided} Offers still Undecided`
			}
			onClick={onOpen}
			size="sm"
			variant="quiet"
		>
			<ListTodo aria-hidden className="size-3.5" />
			{undecided === 0 ? null : undecided}
		</Button>
	)
}
