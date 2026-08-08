import type { ReactNode } from 'react'

import { useArticle } from '../lib/article'
import type { ArticleSocket } from '../lib/useArticleAgent'
import { ChatPanel } from './ChatPanel'
import { useArticleChat } from './useArticleChat'

/** Drives `ChatPanel` from one Article Agent. Takes the socket rather than
 * opening one — §8. */

export interface ArticleChatPanelProps {
	agent: ArticleSocket
	placeholder?: string
	/** Left of send — the Offer ledger toggle. */
	leading?: ReactNode
	className?: string
}

export function ArticleChatPanel({
	agent,
	placeholder,
	leading,
	className,
}: ArticleChatPanelProps) {
	const { plan } = useArticle().plan
	const chat = useArticleChat(agent)
	const { ledger } = chat

	// A Proposal card names Sections out of the Plan, so there is nothing to draw
	// until one arrives.
	if (plan === null) {
		return (
			<div className={className}>
				<p className="p-3.5 text-[0.75rem] text-faint">Opening the Chat…</p>
			</div>
		)
	}

	return (
		<ChatPanel
			busy={chat.busy}
			className={className}
			failure={chat.failure ?? ledger.failure}
			leading={leading}
			messages={chat.messages}
			offers={ledger.ledger.offers}
			onAccept={chat.accept}
			onAcceptOffer={ledger.accept}
			onDecline={chat.decline}
			onDeclineOffer={ledger.decline}
			onRestoreOffer={ledger.restore}
			onSend={chat.send}
			placeholder={placeholder}
			plan={plan}
			refusals={chat.refusals}
			waiting={chat.waiting}
		/>
	)
}
