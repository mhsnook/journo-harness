import { ListTodo } from 'lucide-react'
import { useRef, useState } from 'react'

import { ChatPanel } from '../../../src/client/chat/ChatPanel'
import { OfferLedgerDrawer } from '../../../src/client/chat/OfferLedgerDrawer'
import { ArticleBar } from '../../../src/client/components/ArticleBar'
import { Button } from '../../../src/client/components/Button'
import { Frame, FrameBody } from '../../../src/client/components/Frame'
import { useArticle } from '../../../src/client/lib/article'
import { PlanPanel } from '../../../src/client/plan/PlanPanel'
import { ARTICLE_TITLE } from '../../mock/content'
import { useMockPlan } from '../../mock/MockArticle'
import { useMockChat } from '../../mock/MockChat'
import { midChat } from '../../mock/transcript'

/**
 * Storybook fixture 2(f): the Offer ledger open over the Chat Panel's
 * transcript, beside a Plan Panel. The drawer, the toggle, and the rulings are
 * the ones the app runs, so the toggle closes what it opened and Escape
 * dismisses.
 */
export function LedgerDrawerScreen() {
	const { edit } = useArticle().plan
	const plan = useMockPlan()
	const { ledger, ...chat } = useMockChat(midChat)
	const [open, setOpen] = useState(true)
	const toggle = useRef<HTMLButtonElement>(null)

	const close = () => {
		setOpen(false)
		toggle.current?.focus()
	}

	return (
		<Frame width={820}>
			<ArticleBar title={ARTICLE_TITLE} open={['chat', 'plan']} status="ledger" />
			<FrameBody row className="h-[22rem]">
				<ChatPanel
					{...chat}
					divider="right"
					drawer={<OfferLedgerDrawer ledger={ledger} onClose={close} open={open} />}
					leading={
						<Button
							aria-expanded={open}
							aria-label="Offer ledger"
							onClick={() => (open ? close() : setOpen(true))}
							pressed={open}
							ref={toggle}
							size="sm"
							variant="quiet"
						>
							<ListTodo aria-hidden className="size-3.5" />
						</Button>
					}
					plan={plan}
				/>
				<PlanPanel plan={plan} edit={edit} />
			</FrameBody>
		</Frame>
	)
}
