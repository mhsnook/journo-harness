import { ArticleBar } from '../../components/ArticleBar'
import { Button } from '../../components/Button'
import { ChatComposer, ChatMessage } from '../../components/Chat'
import { Frame, FrameBody } from '../../components/Frame'
import { Pane } from '../../components/Pane'
import { ARTICLE_TITLE, outline } from '../../mock/content'
import { PlanBlock, PlanLength, PlanOutline } from './PlanBlocks'

/**
 * 2(c) — Scrolled to the end of the conversation. "Start drafting" appears
 * once the plan has a length and at least one section. It is a suggestion, not
 * a gate: the draft pill was available all along.
 */
export function ReadyToDraftScreen() {
  return (
    <Frame width={780}>
      <ArticleBar title={ARTICLE_TITLE} open={['chat', 'plan']} status="planning" />
      <FrameBody row className="min-h-[21rem]">
        <Pane divider="right" className="gap-3">
          <p className="text-center text-[0.6875rem] text-faint">↑ earlier in this conversation</p>
          <ChatMessage from="agent">
            That gives §3 the human cost and keeps the numbers in §2 where they belong.
          </ChatMessage>
          <ChatMessage from="me">Good. Leave §4 short — I don't want to write a manifesto.</ChatMessage>
          <ChatMessage from="agent">
            Four sections, 2,400 words, thirteen references and eight quotes saved. Ready when you
            are.
          </ChatMessage>
          <ChatComposer />
        </Pane>

        <Pane tone="sunk" padded={false}>
          <div className="flex flex-1 flex-col gap-3.5 p-3.5">
            <PlanLength words={2400} />
            <PlanBlock title="Outline" meta="4 sections">
              <PlanOutline sections={outline} dense />
            </PlanBlock>
            <p className="text-[0.75rem] text-muted">13 references · 8 quotes</p>
          </div>
          <div className="flex items-center gap-3 border-t border-edge px-3.5 py-3">
            <Button tone="accent">start drafting →</Button>
            <span className="text-[0.75rem] text-faint">or keep talking</span>
          </div>
        </Pane>
      </FrameBody>
    </Frame>
  )
}
