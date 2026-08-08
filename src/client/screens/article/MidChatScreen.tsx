import { ChatPanel } from '../../chat/ChatPanel'
import { ArticleBar } from '../../components/ArticleBar'
import { Frame, FrameBody } from '../../components/Frame'
import { useArticle } from '../../lib/article'
import { useMockPlan } from '../../mock/MockArticle'
import { useMockChat } from '../../mock/MockChat'
import { midChat } from '../../mock/transcript'
import { PlanPanel } from '../../plan/PlanPanel'

/** 2(b) — Mid-chat, with a live Proposal. Accepting it moves the Outline in the
 * Plan Panel beside it: both go through the one writer. */
export function MidChatScreen() {
	const { edit, refusal } = useArticle().plan
	const plan = useMockPlan()
	const chat = useMockChat(midChat)

	return (
		<Frame width={880}>
			<ArticleBar title={plan.title} open={['chat', 'plan']} status="planning" />
			<FrameBody row className="h-[26rem]">
				<ChatPanel {...chat} className="border-r border-edge" plan={plan} />
				<PlanPanel edit={edit} plan={plan} refusal={refusal} />
			</FrameBody>
		</Frame>
	)
}
