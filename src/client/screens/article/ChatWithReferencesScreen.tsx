import { ChatPanel } from '../../chat/ChatPanel'
import { ArticleBar } from '../../components/ArticleBar'
import { Frame, FrameBody } from '../../components/Frame'
import { useArticlePlan } from '../../lib/article'
import { useMockChat } from '../../mock/MockChat'
import { researchTurn } from '../../mock/transcript'

/**
 * 2(d) — A turn that returned a lot, with the Chat Panel at full width. The
 * turn recorded its Offers as rows and handed back their ids; the cards are the
 * Offer ledger's rows, so Accepting one copies it straight into the Plan and
 * the row keeps the ruling either way.
 */
export function ChatWithReferencesScreen() {
	const plan = useArticlePlan()
	const chat = useMockChat(researchTurn)

	return (
		<Frame width={700}>
			<ArticleBar title={plan.title} open={['chat']} status="research" />
			<FrameBody className="h-[30rem]">
				<ChatPanel
					{...chat}
					placeholder="More like the throughput study, but for transit…"
					plan={plan}
				/>
			</FrameBody>
		</Frame>
	)
}
