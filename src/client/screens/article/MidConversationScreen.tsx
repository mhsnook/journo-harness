import { ArticleBar } from '../../components/ArticleBar'
import { ChatComposer, ChatMessage } from '../../components/Chat'
import { Frame, FrameBody } from '../../components/Frame'
import { Pane } from '../../components/Pane'
import { SourceCard } from '../../components/SourceCard'
import { ARTICLE_TITLE, outline, quotes, sources } from '../../mock/content'
import { PlanBlock, PlanLength, PlanOutline, PlanQuotes, PlanReferences } from './PlanBlocks'

/**
 * 2(b) — Mid-conversation. Ticking a source in the chat sends it straight into
 * References; there is no interstitial approval screen. Meanwhile section 3 is
 * being typed by hand in the plan, which is equally allowed.
 */
export function MidConversationScreen() {
  return (
    <Frame width={800}>
      <ArticleBar title={ARTICLE_TITLE} open={['chat', 'plan']} status="planning" />
      <FrameBody row className="min-h-[24rem]">
        <Pane divider="right" className="gap-3">
          <ChatMessage from="me">
            The process, then — but I want one developer in it so it isn't all spreadsheets.
          </ChatMessage>
          <ChatMessage from="agent">
            Two that carry the argument, both from your favourites:
          </ChatMessage>
          <div className="flex flex-col gap-2">
            <SourceCard source={sources[0]} variant="ledger" />
            <SourceCard source={sources[3]} variant="ledger" compact />
          </div>
          <ChatMessage from="agent">
            The throughput study has a line that would open §2 well. I've pulled it into quotes.
          </ChatMessage>
          <ChatComposer />
        </Pane>

        <Pane tone="sunk">
          <PlanLength words={2400} voice="Reported feature" />
          <PlanBlock title="Outline" meta="3 of ~4">
            <PlanOutline
              sections={outline.slice(0, 2)}
              typing="Who actually pays for the delay"
              showAdd
            />
          </PlanBlock>
          <PlanBlock title="References" meta="5">
            <PlanReferences sources={[sources[0], sources[1]]} justAddedId={sources[0].id} />
          </PlanBlock>
          <PlanBlock title="Quotes" meta="3">
            <PlanQuotes quotes={[quotes[0], quotes[2]]} />
          </PlanBlock>
        </Pane>
      </FrameBody>
    </Frame>
  )
}
