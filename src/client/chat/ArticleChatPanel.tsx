import type { ReactNode } from 'react'

import { useArticle } from '../lib/article'
import type { ArticleSocket } from '../lib/useArticleAgent'
import { ChatPanel } from './ChatPanel'
import { useArticleChat } from './useArticleChat'

/**
 * The Chat Panel, wired to one Article Agent. It takes the socket rather than
 * opening one: the wire is multiplexed and the Plan already holds it — §8.
 * Laying it out beside the other three Panels is issue #29.
 */

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

	// A Proposal is described against the Plan on screen, so the Panel waits for
	// the first state update the way the Plan Panel does. It settles in well
	// under a second, and #29 hoists this gate above every Panel.
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
