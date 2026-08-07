import { ArticleBar } from '../../components/ArticleBar'
import { ChatComposer, ChatMessage } from '../../components/Chat'
import { GroupHeading } from '../../components/Divider'
import { Frame, FrameBody } from '../../components/Frame'
import { Panel } from '../../components/Panel'
import { ReferenceCard } from '../../components/ReferenceCard'
import { ARTICLE_TITLE, references } from '../../mock/content'

/**
 * 2(d) — A turn that returned a lot, with the chat Panel at full width. Keeping
 * one sends it straight across into the plan; nothing waits in a holding pen.
 */
export function ChatWithReferencesScreen() {
	return (
		<Frame width={700}>
			<ArticleBar title={ARTICLE_TITLE} open={['chat']} status="research" />
			<FrameBody>
				<Panel className="gap-3">
					<ChatMessage from="me">
						Find me everything on approval times in comparable cities. Cast wide, I'll
						declined.
					</ChatMessage>
					<ChatMessage from="guide">
						Seventeen worth showing you. Two are from your favourites, and I've ranked
						those first.
					</ChatMessage>

					<GroupHeading
						count="17 found"
						action={
							<span className="text-[0.6875rem] text-faint">
								keep 9 · declined 5 · undecided 3
							</span>
						}
					>
						References
					</GroupHeading>

					<div className="flex flex-col gap-2">
						<ReferenceCard reference={references[0]} />
						<ReferenceCard reference={references[1]} />
						<ReferenceCard reference={references[2]} />
						<ReferenceCard reference={references[4]} />
					</div>

					<p className="text-[0.6875rem] text-faint">
						Keeping one sends it straight to the plan — the ledger keeps the whole list
						either way.
					</p>
					<ChatComposer placeholder="More like the throughput study, but for transit…" />
				</Panel>
			</FrameBody>
		</Frame>
	)
}
