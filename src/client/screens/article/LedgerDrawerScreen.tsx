import { OfferLedgerPanel } from '../../chat/OfferLedgerPanel'
import { ArticleBar } from '../../components/ArticleBar'
import { Frame, FrameBody } from '../../components/Frame'
import { useArticle } from '../../lib/article'
import { useOfferLedger } from '../../lib/useOfferLedger'
import { ARTICLE_TITLE } from '../../mock/content'
import { useMockPlan } from '../../mock/MockArticle'
import { PlanPanel } from '../../plan/PlanPanel'

/**
 * Storybook fixture 2(f): `OfferLedgerPanel` open beside a Plan Panel, in a
 * fixed-width Frame. Filtering and ruling work; `close ×` is inert, since
 * there is no Chat here to go back to.
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
