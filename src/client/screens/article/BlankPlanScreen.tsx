import { ArticleBar } from '../../components/ArticleBar'
import { ChatComposer, ChatMessage } from '../../components/Chat'
import { EmptySlot } from '../../components/Field'
import { Frame, FrameBody } from '../../components/Frame'
import { Panel } from '../../components/Panel'
import { ARTICLE_TITLE } from '../../mock/content'
import { PlanBlock, PlanLength } from './PlanBlocks'

/**
 * 2(a) — First message. The plan is already on screen, empty and touchable.
 * There is no triage step and nothing to "finish": the draft pill is available
 * from the first second, it just has nothing in it yet.
 */
export function BlankPlanScreen() {
	return (
		<Frame width={760}>
			<ArticleBar title={ARTICLE_TITLE} open={['chat', 'plan']} status="new" />
			<FrameBody row className="h-[20rem]">
				<Panel divider="right" className="gap-3">
					<ChatMessage from="me">
						I want to write about why permitting got so slow, using this city as the case.
						Roughly feature length. Start by finding me the numbers.
					</ChatMessage>
					<ChatMessage from="guide">
						Before I search — is this the story of the process, or the story of the people
						stuck in it? That changes which references are worth your time.
					</ChatMessage>
					<ChatComposer />
				</Panel>

				<Panel variant="sunk">
					<PlanLength />
					<PlanBlock title="Outline" meta="empty">
						<EmptySlot className="min-h-[3.5rem]">
							Sections appear as you agree on them — and you can type your own straight in
							here
						</EmptySlot>
					</PlanBlock>
					<PlanBlock title="References" meta="0">
						<EmptySlot>Tick a reference in the chat, or paste your own</EmptySlot>
					</PlanBlock>
					<p className="mt-auto text-[0.6875rem] text-faint">
						Scrolls. Nothing here is locked, and nothing has to be finished before you
						write.
					</p>
				</Panel>
			</FrameBody>
		</Frame>
	)
}
