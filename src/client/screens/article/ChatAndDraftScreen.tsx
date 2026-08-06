import { ArticleBar } from '../../components/ArticleBar'
import { ChatComposer, ChatMessage, ChatSuggestions } from '../../components/Chat'
import { Chip } from '../../components/Chip'
import { DraftSurface } from '../../components/DraftSurface'
import { Frame, FrameBody } from '../../components/Frame'
import { Pane } from '../../components/Pane'
import { ARTICLE_TITLE, draftParagraphs } from '../../mock/content'

/**
 * 3(c) — Chat beside the draft, for when you hit something mid-sentence that
 * needs looking up. The chat pane never takes more than half the window, and
 * whatever it produces lands in the plan rather than in the prose.
 */
export function ChatAndDraftScreen() {
  return (
    <Frame width={760}>
      <ArticleBar title={ARTICLE_TITLE} open={['chat', 'draft']} status="§3" />
      <FrameBody row className="min-h-[19rem]">
        <Pane tone="sunk" divider="right" width="40%" className="gap-3">
          <ChatMessage from="me">
            Is there a number for what a stalled mid-rise costs per week?
          </ChatMessage>
          <ChatMessage from="agent">
            Municipal Review put it at £4,100 in 2021 — it's already in your ledger,
            undecided. Two more recent estimates exist if you want them.
          </ChatMessage>
          <ChatSuggestions>
            <Chip tone="accent" interactive>
              add to plan
            </Chip>
            <Chip tone="outline" interactive>
              not now
            </Chip>
          </ChatSuggestions>
          <ChatComposer placeholder="Ask without leaving the sentence…" />
        </Pane>
        <DraftSurface paragraphs={draftParagraphs.slice(0, 3)} measure="narrow" caret />
      </FrameBody>
    </Frame>
  )
}
