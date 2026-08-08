import { ChatPanel } from '../../chat/ChatPanel'
import { ArticleBar } from '../../components/ArticleBar'
import { Frame, FrameBody } from '../../components/Frame'
import { useMockPlan } from '../../mock/MockArticle'
import { useMockChat } from '../../mock/MockChat'
import { researchTurn } from '../../mock/transcript'

/** 2(d) — A turn that returned a lot, Chat Panel at full width. The cards are
 * Offer ledger rows, so Accepting one copies it into the Plan. */
export function ChatWithReferencesScreen() {
	const plan = useMockPlan()
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
