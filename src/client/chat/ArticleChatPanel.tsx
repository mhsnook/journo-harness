import type { ReactNode } from 'react'

import { Panel } from '../components/Panel'
import { useArticle } from '../lib/article'
import type { ArticleSocket } from '../lib/useArticleAgent'
import { ChatPanel, type ChatPanelProps } from './ChatPanel'
import { useArticleChat } from './useArticleChat'

/** Drives `ChatPanel` from one Article Agent. Takes the socket rather than
 * opening one — §8. */

export interface ArticleChatPanelProps {
	agent: ArticleSocket
	placeholder?: string
	/** Left of send — the Offer ledger toggle. */
	leading?: ReactNode
	divider?: ChatPanelProps['divider']
	className?: string
}

export function ArticleChatPanel({
	agent,
	placeholder,
	leading,
	divider,
	className,
}: ArticleChatPanelProps) {
	const { plan } = useArticle().plan
	const chat = useArticleChat(agent)
	const { ledger } = chat

	// A Proposal card names Sections out of the Plan, so there is nothing to draw
	// until one arrives.
	if (plan === null) {
		return (
			<Panel className={className} divider={divider}>
				<p className="text-[0.75rem] text-faint">Opening the Chat…</p>
			</Panel>
		)
	}

	return (
		<ChatPanel
			busy={chat.busy}
			className={className}
			divider={divider}
			failure={chat.failure ?? ledger.failure}
			leading={leading}
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
	)
}
