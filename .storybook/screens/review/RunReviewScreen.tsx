import { ArticleBar } from '../../../src/client/components/ArticleBar'
import { DraftSurface } from '../../../src/client/components/DraftSurface'
import { Frame, FrameBody } from '../../../src/client/components/Frame'
import { ArticleNotesPanel } from '../../../src/client/notes/ArticleNotesPanel'
import { ARTICLE_TITLE, draftParagraphs } from '../../mock/content'
import { reviewNotes, reviewRound } from '../../mock/review'
import { MockNotes } from './FullReviewScreen'

/**
 * 4(g) — Asking for a Review, and waiting on it.
 *
 * The Article Agent runs the Review, so the wait is a row rather than a call
 * the writer is holding open: they can close this and come back to the
 * findings. The Panel says so instead of spinning.
 */
export function RunReviewScreen() {
	return (
		<MockNotes answer={{ passages: reviewRound.passages, notes: reviewNotes }} notes={[]}>
			<Frame width={760}>
				<ArticleBar open={['draft', 'notes']} status="drafting" title={ARTICLE_TITLE} />
				<FrameBody className="h-[26rem]" row>
					<DraftSurface measure="narrow" paragraphs={draftParagraphs.slice(0, 3)} />
					<ArticleNotesPanel divider="left" grow={0.4} />
				</FrameBody>
			</Frame>
		</MockNotes>
	)
}
