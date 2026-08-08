import { ChatPanel } from '../../chat/ChatPanel'
import { ArticleBar } from '../../components/ArticleBar'
import { Frame, FrameBody } from '../../components/Frame'
import { useArticle } from '../../lib/article'
import { useMockPlan } from '../../mock/MockArticle'
import { useMockChat } from '../../mock/MockChat'
import { midChat } from '../../mock/transcript'
import { PlanPanel } from '../../plan/PlanPanel'

/**
 * 2(b) — Mid-chat. The Chat has proposed a Section and a new total, and the
 * Proposal waits on the writer. Accepting applies it through the same writer
 * the Plan Panel beside it types into, so the Outline moves as you rule.
 */
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
