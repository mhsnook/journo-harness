import { ArticleBar } from '../../components/ArticleBar'
import { DraftSurface } from '../../components/DraftSurface'
import { Frame, FrameBody } from '../../components/Frame'
import { ARTICLE_TITLE, draftParagraphs, outline } from '../../mock/content'
import { PlanRail } from './PlanRail'

/**
 * 3(a) — Checking myself against the plan. The outline sits in a rail with a
 * quiet bar per section; the draft keeps the room.
 */
export function PlanAndDraftScreen() {
	return (
		<Frame width={720}>
			<ArticleBar title={ARTICLE_TITLE} open={['plan', 'draft']} status="draft 1" />
			<FrameBody row className="min-h-[19rem]">
				<PlanRail
					sections={outline}
					written={[300, 700, 520, 0]}
					counts={['refs 2/12', 'quotes 4/6', 'notes 1/3']}
				/>
				<DraftSurface paragraphs={draftParagraphs} measure="narrow" caret />
			</FrameBody>
		</Frame>
	)
}
