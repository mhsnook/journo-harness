import { ArticleBar } from '../../components/ArticleBar'
import { ChatComposer, ChatMessage } from '../../components/Chat'
import { SectionHeading } from '../../components/Divider'
import { Frame, FrameBody } from '../../components/Frame'
import { Pane } from '../../components/Pane'
import { SourceCard } from '../../components/SourceCard'
import { ARTICLE_TITLE, sources } from '../../mock/content'

/**
 * 2(d) — A turn that returned a lot, with the chat pane at full width. Keeping
 * one sends it straight across into the plan; nothing waits in a holding pen.
 */
export function ChatWithSourcesScreen() {
	return (
		<Frame width={700}>
			<ArticleBar title={ARTICLE_TITLE} open={['chat']} status="research" />
			<FrameBody>
				<Pane className="gap-3">
					<ChatMessage from="me">
						Find me everything on approval times in comparable cities. Cast wide, I'll
						cut.
					</ChatMessage>
					<ChatMessage from="agent">
						Seventeen worth showing you. Two are from your favourites, and I've ranked
						those first.
					</ChatMessage>

					<SectionHeading
						count="17 found"
						action={
							<span className="text-[0.6875rem] text-faint">
								keep 9 · cut 5 · undecided 3
							</span>
						}
					>
						Sources
					</SectionHeading>

					<div className="flex flex-col gap-2">
						<SourceCard source={sources[0]} />
						<SourceCard source={sources[1]} />
						<SourceCard source={sources[2]} />
						<SourceCard source={sources[4]} />
					</div>

					<p className="text-[0.6875rem] text-faint">
						Keeping one sends it straight to the plan — the ledger keeps the whole list
						either way.
					</p>
					<ChatComposer placeholder="More like the throughput study, but for transit…" />
				</Pane>
			</FrameBody>
		</Frame>
	)
}
