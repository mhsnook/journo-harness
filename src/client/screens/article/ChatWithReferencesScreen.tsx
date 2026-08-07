import { ArticleBar } from '../../components/ArticleBar'
import { ChatComposer, ChatMessage } from '../../components/Chat'
import { GroupHeading } from '../../components/Divider'
import { Frame, FrameBody } from '../../components/Frame'
import { Panel } from '../../components/Panel'
import { ReferenceCard } from '../../components/ReferenceCard'
import { useOfferLedger } from '../../lib/useOfferLedger'
import { ARTICLE_TITLE } from '../../mock/content'

/**
 * 2(d) — A turn that returned a lot, with the Chat Panel at full width.
 * Accepting one copies it straight into the Plan; nothing waits in a holding
 * pen. The Offer ledger keeps the whole list either way.
 */
export function ChatWithReferencesScreen() {
	const { ledger, accept, decline } = useOfferLedger()

	return (
		<Frame width={700}>
			<ArticleBar title={ARTICLE_TITLE} open={['chat']} status="research" />
			<FrameBody>
				<Panel className="gap-3">
					<ChatMessage from="me">
						Find me everything on approval times in comparable cities. Cast wide, I'll
						rule on them.
					</ChatMessage>
					<ChatMessage from="guide">
						{ledger.counts.all} worth showing you. Two are from your favourites, and I've
						ranked those first.
					</ChatMessage>

					<GroupHeading
						count={`${ledger.counts.all} found`}
						action={
							<span className="text-[0.6875rem] text-faint">
								{ledger.counts.accepted} Accepted · {ledger.counts.declined} Declined ·{' '}
								{ledger.counts.undecided} Undecided
							</span>
						}
					>
						Offers
					</GroupHeading>

					<div className="flex flex-col gap-2">
						{ledger.offers.map((offer) => (
							<ReferenceCard
								key={offer.id}
								offer={offer}
								onAccept={() => accept(offer)}
								onDecline={() => decline(offer)}
							/>
						))}
					</div>

					<p className="text-[0.6875rem] text-faint">
						Accepting one copies it into the Plan — the Offer ledger keeps the whole list
						either way.
					</p>
					<ChatComposer placeholder="More like the throughput study, but for transit…" />
				</Panel>
			</FrameBody>
		</Frame>
	)
}
