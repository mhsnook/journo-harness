import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import type { Plan, ProposalInput, Refusal } from '../../../shared/plan'
import { applyProposal, emptyPlan } from '../../../shared/plan'
import { Annotation } from '../../components/Annotation'
import { Frame, FrameBody } from '../../components/Frame'
import { plan as plannedArticle } from '../../mock/content'
import { MockArticle } from '../../mock/MockArticle'
import { PlanPanel } from '../../plan/PlanPanel'
import { BlankPlanScreen } from './BlankPlanScreen'
import { ChatWithReferencesScreen } from './ChatWithReferencesScreen'
import { LedgerDrawerScreen } from './LedgerDrawerScreen'
import { LedgerPopoverScreen } from './LedgerPopoverScreen'
import { MidChatScreen } from './MidChatScreen'
import { PlanSheetScreen } from './PlanSheetScreen'
import { ReadyToDraftScreen } from './ReadyToDraftScreen'

const meta = {
	title: 'Screens/2 Plan an article',
	parameters: { layout: 'centered' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/**
 * The Plan Panel, with the applier behind it and local state standing in for
 * the Article Agent. Every edit runs the ops the app runs, so a refusal shows
 * up here the way the writer would meet it.
 */
function EditablePlan({ start }: { start: Plan }) {
	const [plan, setPlan] = useState(start)
	const [refusal, setRefusal] = useState<Refusal | null>(null)

	const edit = (ops: ProposalInput | null) => {
		if (ops === null) return

		setRefusal(null)
		const result = applyProposal(plan, ops)
		if (result.ok) setPlan(result.plan)
		else setRefusal(result.refusal)
	}

	return (
		<Frame width={520}>
			<FrameBody className="h-[26rem]">
				<PlanPanel edit={edit} plan={plan} refusal={refusal} />
			</FrameBody>
		</Frame>
	)
}

export const A_BlankPlan: Story = {
	name: '2(a) Blank page',
	render: () => (
		<div className="flex flex-col">
			<BlankPlanScreen />
			<Annotation>
				Nothing on this screen is accented, and that is the point: an empty plan is not
				asking you for a decision yet. The plan is live from the first message so it can
				never feel like a gate you have to pass.
			</Annotation>
		</div>
	),
}

export const B_MidConversation: Story = {
	name: '2(b) Mid-chat',
	render: () => (
		<div className="flex flex-col">
			<MidChatScreen />
			<Annotation>
				Ticking a reference in the chat sends it across into References immediately — the
				wash on the newly added reference is the only thing marking the change. Section 3
				is being typed by hand at the same time, which is equally allowed.
			</Annotation>
		</div>
	),
}

export const C_ReadyToDraft: Story = {
	name: '2(c) Ready to draft',
	render: () => (
		<div className="flex flex-col">
			<ReadyToDraftScreen />
			<Annotation>
				The button is a nudge, not a gate — it appears once the plan has a length and at
				least one section, and the draft pill was clickable long before it showed up.
			</Annotation>
		</div>
	),
}

export const D_ChatWithReferences: Story = {
	name: '2(d) A turn that returned a lot',
	render: () => (
		<div className="flex flex-col">
			<MockArticle>
				<ChatWithReferencesScreen />
			</MockArticle>
			<Annotation>
				Accept and Decline are the writer's two rulings, and they are the words everywhere
				— the card, the Offer ledger, and the Plan. Accepting copies the Offer into the
				Plan and leaves the row where it is.
			</Annotation>
		</div>
	),
}

export const E_PlanSheet: Story = {
	name: '2(e) The plan on its own',
	render: () => (
		<div className="flex flex-col">
			<PlanSheetScreen />
			<Annotation>
				The Outline and the References are stacked, never columned: inside a status the
				eye should only have to travel one way. One list holds both Links and Quotes,
				because the type is a field on the record. The bar beside the Outline is the shape
				of the piece — 300 / 700 / 900 / 500 of 2,400.
			</Annotation>
		</div>
	),
}

export const F_LedgerDrawer: Story = {
	name: '2(f) Offer ledger',
	render: () => (
		<div className="flex flex-col">
			<MockArticle>
				<LedgerDrawerScreen />
			</MockArticle>
			<Annotation>
				The same list at every stage — early on most rows read Undecided, later most are
				placed. That is precisely why there is no separate triage screen. Accepting a row
				on the left copies it into the Plan on the right: the row keeps what was turned
				up, and the copy is the writer's to edit.
			</Annotation>
		</div>
	),
}

export const G_LedgerPopover: Story = {
	name: '2(g) Offer ledger from the composer',
	render: () => (
		<div className="flex flex-col">
			<MockArticle>
				<LedgerPopoverScreen />
			</MockArticle>
			<Annotation>
				The groups are the three rulings and their order is fixed, so the Undecided pile
				visibly shrinks as you work. It reads no Plan: once an Offer is Accepted, where
				the Reference sits is the Plan Panel's to show.
			</Annotation>
		</div>
	),
}

export const H_PlanPanelBlank: Story = {
	name: '2(h) The Plan Panel, new Article',
	render: () => (
		<div className="flex flex-col">
			<EditablePlan start={emptyPlan()} />
			<Annotation>
				The wired Panel, not a wireframe. A new Article opens into this: a title, no
				length, no Tone, and one button that makes the first Section.
			</Annotation>
		</div>
	),
}

export const I_PlanPanelWired: Story = {
	name: '2(i) The Plan Panel, under way',
	render: () => (
		<div className="flex flex-col">
			<EditablePlan start={plannedArticle} />
			<Annotation>
				Every field here writes through the same ops the Chat proposes in, so the Panel
				cannot make a change the applier would refuse. Typing debounces: the Plan is one
				blob re-broadcast on every write, and a keystroke is not a write.
			</Annotation>
		</div>
	),
}
