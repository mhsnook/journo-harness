import { ChatComposer, ChatMessage } from '../../components/Chat'
import { EmptySlot } from '../../components/Field'
import { Frame, FrameBody } from '../../components/Frame'
import { Pane } from '../../components/Pane'
import { ArticleBar } from '../../components/ArticleBar'
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
      <FrameBody row className="min-h-[20rem]">
        <Pane divider="right" className="gap-3">
          <ChatMessage from="me">
            I want to write about why permitting got so slow, using this city as the case. Roughly
            feature length. Start by finding me the numbers.
          </ChatMessage>
          <ChatMessage from="agent">
            Before I search — is this the story of the process, or the story of the people stuck in
            it? That changes which sources are worth your time.
          </ChatMessage>
          <ChatComposer />
        </Pane>

        <Pane tone="sunk">
          <PlanLength />
          <PlanBlock title="Outline" meta="empty">
            <EmptySlot className="min-h-[3.5rem]">
              Sections appear as you agree on them — and you can type your own straight in here
            </EmptySlot>
          </PlanBlock>
          <PlanBlock title="References" meta="0">
            <EmptySlot>Tick a source in the chat</EmptySlot>
          </PlanBlock>
          <PlanBlock title="Quotes" meta="0">
            <EmptySlot>Or paste your own</EmptySlot>
          </PlanBlock>
          <p className="mt-auto text-[0.6875rem] text-faint">
            Scrolls. Nothing here is locked, and nothing has to be finished before you write.
          </p>
        </Pane>
      </FrameBody>
    </Frame>
  )
}
