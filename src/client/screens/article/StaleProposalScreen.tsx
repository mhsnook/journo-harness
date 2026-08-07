import { ChatPanel } from '../../chat/ChatPanel'
import { ArticleBar } from '../../components/ArticleBar'
import { Frame, FrameBody } from '../../components/Frame'
import { useArticlePlan } from '../../lib/article'
import { useMockChat } from '../../mock/MockChat'
import { staleProposal } from '../../mock/transcript'

/**
 * 2(j) — A Proposal the Plan refuses. Accept it and the applier compares the
 * op's `expected` whole-field against the title the Plan carries, finds they
 * differ, and refuses the batch. The card says which op failed, what it
 * expected, and what it found, and stays open: the writer can fix the Plan and
 * Accept again, or Decline and send that sentence back to the Chat.
 */
export function StaleProposalScreen() {
	const plan = useArticlePlan()
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
