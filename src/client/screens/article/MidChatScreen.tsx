import { ArticleBar } from '../../components/ArticleBar'
import { ChatComposer, ChatMessage } from '../../components/Chat'
import { Frame, FrameBody } from '../../components/Frame'
import { Panel } from '../../components/Panel'
import { ReferenceCard } from '../../components/ReferenceCard'
import { ARTICLE_TITLE, plan, references } from '../../mock/content'
import { PlanBlock, PlanLength, PlanOutline, PlanReferences } from './PlanBlocks'

/**
 * 2(b) — Mid-chat. Ticking a reference in the chat sends it straight into
 * References; there is no interstitial approval screen. Meanwhile section 3 is
 * being typed by hand in the plan, which is equally allowed.
 */
export function MidChatScreen() {
	return (
		<Frame width={800}>
			<ArticleBar title={ARTICLE_TITLE} open={['chat', 'plan']} status="planning" />
			<FrameBody row className="min-h-[24rem]">
				<Panel divider="right" className="gap-3">
					<ChatMessage from="me">
						The process, then — but I want one developer in it so it isn't all
						spreadsheets.
					</ChatMessage>
					<ChatMessage from="guide">
						Two that carry the argument, both from your favourites:
					</ChatMessage>
					<div className="flex flex-col gap-2">
						<ReferenceCard reference={references[0]} variant="ledger" />
						<ReferenceCard reference={references[3]} variant="ledger" compact />
					</div>
					<ChatMessage from="guide">
						The throughput study has a line that would open §2 well. I've pulled it into
						quotes.
					</ChatMessage>
					<ChatComposer />
				</Panel>

				<Panel variant="sunk">
					<PlanLength total={plan.totalTarget} voice={plan.voice} />
					<PlanBlock title="Outline" meta="3 of ~4">
						<PlanOutline
							outline={plan.outline.slice(0, 2)}
							typing="Who actually pays for the delay"
							showAdd
						/>
					</PlanBlock>
					<PlanBlock title="References" meta="4">
						<PlanReferences
							references={plan.references.slice(0, 3)}
							justAddedId={plan.references[0].id}
						/>
					</PlanBlock>
				</Panel>
			</FrameBody>
		</Frame>
	)
}
