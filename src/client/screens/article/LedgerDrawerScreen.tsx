import { OfferLedgerPanel } from '../../chat/OfferLedgerPanel'
import { ArticleBar } from '../../components/ArticleBar'
import { Frame, FrameBody } from '../../components/Frame'
import { useArticle } from '../../lib/article'
import { useOfferLedger } from '../../lib/useOfferLedger'
import { ARTICLE_TITLE } from '../../mock/content'
import { useMockPlan } from '../../mock/MockArticle'
import { PlanPanel } from '../../plan/PlanPanel'

/**
 * 2(f) — The Offer ledger, open over the Chat. The Panel is the one the app
 * runs, so this screen is the writer's own view of it: filtering and ruling
 * both work here.
 *
 * `close ×` does nothing, because the Chat it would go back to is not on this
 * screen. The Plan Panel beside it is the ordinary one, rendered so the screen
 * reads as the writer meets it. Nothing here reaches into it — where a
 * Reference sits, and which sit nowhere yet, are its own to show.
 */
export function LedgerDrawerScreen() {
	const { edit } = useArticle().plan
	const plan = useMockPlan()
	const ledger = useOfferLedger()

	return (
		<Frame width={820}>
			<ArticleBar title={ARTICLE_TITLE} open={['chat', 'plan']} status="ledger" />
			<FrameBody row className="h-[22rem]">
				<OfferLedgerPanel divider="right" ledger={ledger} onClose={() => {}} />
				<PlanPanel plan={plan} edit={edit} />
			</FrameBody>
		</Frame>
	)
}
