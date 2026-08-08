import { ChatPanel } from '../../chat/ChatPanel'
import { ArticleBar } from '../../components/ArticleBar'
import { Frame, FrameBody } from '../../components/Frame'
import { useMockPlan } from '../../mock/MockArticle'
import { useMockChat } from '../../mock/MockChat'
import { staleProposal } from '../../mock/transcript'

/** 2(j) — A Proposal the Plan refuses. Accept it: the card says what it expected
 * against what it found, and stays open. */
export function StaleProposalScreen() {
	const plan = useMockPlan()
	const chat = useMockChat(staleProposal)

	return (
		<Frame width={560}>
			<ArticleBar title={plan.title} open={['chat']} status="planning" />
			<FrameBody className="h-[18rem]">
				<ChatPanel {...chat} plan={plan} />
			</FrameBody>
		</Frame>
	)
}
