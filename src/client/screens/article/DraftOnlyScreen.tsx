import { ArticleBar } from '../../components/ArticleBar'
import { NoteDot } from '../../components/CoachNote'
import { DraftSurface } from '../../components/DraftSurface'
import { Frame, FrameBody } from '../../components/Frame'
import { ARTICLE_TITLE, draftParagraphs } from '../../mock/content'

/**
 * 3(b) — The draft alone, which is where the default user spends almost all of
 * their time. Nothing on screen but the prose; the accent dot in the corner is
 * the app's entire vocabulary for "there is something to read when you stop".
 */
export function DraftOnlyScreen() {
  return (
    <Frame width={640}>
      <ArticleBar title={ARTICLE_TITLE} open={['draft']} status="esc" divided={false} />
      <FrameBody className="min-h-[19rem]">
        <DraftSurface paragraphs={draftParagraphs} caret />
        <div className="flex justify-end px-5 pb-4">
          <NoteDot count={3} />
        </div>
      </FrameBody>
    </Frame>
  )
}
