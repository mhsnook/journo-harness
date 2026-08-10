import { ArticleBar } from '../../../src/client/components/ArticleBar'
import {
	ChatComposer,
	ChatMessage,
	ChatReplies,
} from '../../../src/client/components/Chat'
import { Chip } from '../../../src/client/components/Chip'
import { DraftSurface } from '../../../src/client/components/DraftSurface'
import { Frame, FrameBody } from '../../../src/client/components/Frame'
import { Panel } from '../../../src/client/components/Panel'
import { ARTICLE_TITLE, draftParagraphs } from '../../mock/content'

/**
 * 3(c) — Chat beside the draft, for when you hit something mid-sentence that
 * needs looking up. The chat Panel never takes more than half the window, and
 * whatever it produces lands in the plan rather than in the prose.
 */
export function ChatAndDraftScreen() {
	return (
		<Frame width={760}>
			<ArticleBar title={ARTICLE_TITLE} open={['chat', 'draft']} status="§3" />
			<FrameBody row className="h-[19rem]">
				<Panel variant="sunk" divider="right" width="40%" className="gap-3">
					<ChatMessage from="me">
						Is there a number for what a stalled mid-rise costs per week?
					</ChatMessage>
					<ChatMessage from="guide">
						Municipal Review put it at £4,100 in 2021 — it's already in your ledger,
						undecided. Two more recent estimates exist if you want them.
					</ChatMessage>
					<ChatReplies>
						<Chip variant="accent" interactive>
							add to plan
						</Chip>
						<Chip variant="outline" interactive>
							not now
						</Chip>
					</ChatReplies>
					<ChatComposer placeholder="Ask without leaving the sentence…" />
				</Panel>
				<DraftSurface paragraphs={draftParagraphs.slice(0, 3)} measure="narrow" caret />
			</FrameBody>
		</Frame>
	)
}
