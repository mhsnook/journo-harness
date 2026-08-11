import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import { Annotation } from '../../../src/client/components/Annotation'
import { Frame, FrameBody } from '../../../src/client/components/Frame'
import { PlanPanel } from '../../../src/client/plan/PlanPanel'
import type { Plan, ProposalInput, Refusal } from '../../../src/shared/plan'
import { applyProposal, emptyPlan } from '../../../src/shared/plan'
import { plan as plannedArticle } from '../../mock/content'
import { MockArticle } from '../../mock/MockArticle'
import { BlankPlanScreen } from './BlankPlanScreen'
import { ChatWithReferencesScreen } from './ChatWithReferencesScreen'
import { LedgerDrawerScreen } from './LedgerDrawerScreen'
import { LedgerPopoverScreen } from './LedgerPopoverScreen'
import { MidChatScreen } from './MidChatScreen'
import { PlanSheetScreen } from './PlanSheetScreen'
import { ReadyToDraftScreen } from './ReadyToDraftScreen'
import { StaleProposalScreen } from './StaleProposalScreen'

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
			<MockArticle>
				<MidChatScreen />
			</MockArticle>
			<Annotation>
				Wired, and the Proposal is live: Accept it and the Section lands in the Outline
				beside it and the total moves to 2,800. The Chat proposes and the client applies,
				so the ops run through the same writer the Plan Panel types into.
			</Annotation>
		</div>
	),
}

const paragraph =
	'The appeal is the part nobody files, and that is the whole mechanism: the objector pays nothing, the clock resets, and the scheme sits another eleven weeks. I want that in its own section rather than folded into the cost one.'

export const B2_ComposerGrows: Story = {
	name: '2(b·i) A paragraph in the composer',
	render: () => (
		<div className="flex flex-col">
			<MockArticle>
				<MidChatScreen />
			</MockArticle>
			<Annotation>
				The composer grows with what the writer types or pastes, up to eight lines. Past
				that it scrolls inside itself, so the transcript above it never falls below about
				half the Panel — this screen is the one the ceiling was picked against. Enter
				breaks the line; control-Enter sends.
			</Annotation>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		const field = canvas.getByLabelText('Message the guide') as HTMLTextAreaElement
		const panel = canvasElement.querySelector('[data-panel]')!
		const composer = canvasElement.querySelector('[data-composer]')!
		// The foot of the transcript, which is where the Chat sits: the opening
		// line has scrolled off the top by now, and the Proposal is the thing the
		// writer is being asked about.
		const latest = canvas.getByText(/The appeal that nobody files/)

		const empty = field.clientHeight

		// This screen is parked on a Proposal and cannot send, so the keys are
		// `Primitives/Overview`'s to check.
		await userEvent.click(field)
		await userEvent.paste(paragraph)
		await expect(field.clientHeight).toBeGreaterThan(empty)

		// Two more paragraphs are past any ceiling, so a fourth changing nothing is
		// the ceiling holding rather than the text happening to fit.
		await userEvent.paste(paragraph.repeat(2))
		const ceiling = field.clientHeight
		await userEvent.paste(paragraph)
		await expect(field.clientHeight).toBe(ceiling)
		await expect(field.scrollHeight).toBeGreaterThan(ceiling)

		// Measured on the field, not the whole composer: the parked Proposal's
		// Notice sits above it, and that is a state the writer is asked to leave.
		const panelBox = panel.getBoundingClientRect()
		const composerBox = composer.getBoundingClientRect()
		await expect(field.clientHeight).toBeLessThanOrEqual(panelBox.height / 2)

		const latestBox = latest.getBoundingClientRect()
		await expect(latestBox.top).toBeGreaterThanOrEqual(panelBox.top)
		await expect(latestBox.bottom).toBeLessThanOrEqual(composerBox.top)

		// Pinned to the foot, so there is nothing below and nothing offering to
		// take you there.
		const transcript = canvasElement.querySelector('[data-scroller]')!
		await expect(canvas.queryByLabelText('Scroll to the latest')).toBeNull()

		// Scrolled up, the way back appears. The transcript otherwise stops
		// mid-sentence against the composer with nothing saying there is more.
		transcript.scrollTop = 0
		const back = await canvas.findByLabelText('Scroll to the latest')

		await userEvent.click(back)
		await waitFor(() =>
			expect(
				transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight,
			).toBeLessThanOrEqual(24),
		)
		await waitFor(() =>
			expect(canvas.queryByLabelText('Scroll to the latest')).toBeNull(),
		)
	},
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
				A drawer over the transcript, not a screen the Chat swaps to: the composer stays
				uncovered, so the control that opened it closes it, and Escape does too. The same
				list at every stage — early on most rows read Undecided, later most are placed,
				which is why there is no separate triage screen. Accepting a row copies it into
				the Plan on the right: the row keeps what was turned up, and the copy is the
				writer's to edit.
			</Annotation>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		const toggle = canvas.getByRole('button', { name: /Offer ledger/ })
		const drawer = canvasElement.querySelector('[aria-label="Offer ledger"]')!
		const transcript = canvasElement.querySelector('[data-scroller]')!
		const composer = canvasElement.querySelector('[data-composer]')!
		// Measured against the transcript's foot, not the composer's own box: the
		// composer sits inside a padded wrapper, and the drawer stops at the
		// wrapper's edge rather than at the field.
		const foot = () => transcript.getBoundingClientRect().bottom

		// Open, the drawer covers the transcript and leaves the composer alone,
		// which is what keeps the toggle in place for the second click.
		await expect(toggle.getAttribute('aria-expanded')).toBe('true')
		await expect(drawer.getBoundingClientRect().top).toBeLessThan(foot())
		await expect(drawer.getBoundingClientRect().bottom).toBeLessThanOrEqual(
			composer.getBoundingClientRect().top,
		)

		// One control, both directions: no traverse to a close button elsewhere.
		// The geometry waits, because closing is a 200ms slide.
		await userEvent.click(toggle)
		await expect(toggle.getAttribute('aria-expanded')).toBe('false')
		await waitFor(() =>
			expect(drawer.getBoundingClientRect().top).toBeGreaterThanOrEqual(foot() - 1),
		)

		// Escape dismisses, and focus lands back on the toggle rather than in the
		// transcript behind it.
		await userEvent.click(toggle)
		await expect(toggle.getAttribute('aria-expanded')).toBe('true')
		await userEvent.keyboard('{Escape}')
		await expect(toggle.getAttribute('aria-expanded')).toBe('false')
		await expect(document.activeElement).toBe(toggle)
	},
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

export const J_StaleProposal: Story = {
	name: '2(j) A Proposal the Plan refuses',
	render: () => (
		<div className="flex flex-col">
			<MockArticle>
				<StaleProposalScreen />
			</MockArticle>
			<Annotation>
				Accept it. Whole-field comparison is conservative and will refuse a Proposal
				against a field the writer has since touched, so the card says which op failed,
				what it expected, and what it found — never a greyed-out card with no explanation.
				It stays open: fix the Plan and Accept again, or Decline and the Chat is told why.
			</Annotation>
		</div>
	),
}
