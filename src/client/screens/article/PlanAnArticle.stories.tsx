import type { Meta, StoryObj } from '@storybook/react-vite'

import { Annotation } from '../../components/Annotation'
import { BlankPlanScreen } from './BlankPlanScreen'
import { ChatWithSourcesScreen } from './ChatWithSourcesScreen'
import { LedgerDrawerScreen } from './LedgerDrawerScreen'
import { LedgerPopoverScreen } from './LedgerPopoverScreen'
import { MidConversationScreen } from './MidConversationScreen'
import { PlanSheetScreen } from './PlanSheetScreen'
import { ReadyToDraftScreen } from './ReadyToDraftScreen'

const meta = {
  title: 'Screens/2 Plan an article',
  parameters: { layout: 'centered' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

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
  name: '2(b) Mid-conversation',
  render: () => (
    <div className="flex flex-col">
      <MidConversationScreen />
      <Annotation>
        Ticking a source in the chat sends it across into References immediately — the
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
        The button is a suggestion, not a gate — it appears once the plan has a length and
        at least one section, and the draft pill was clickable long before it showed up.
      </Annotation>
    </div>
  ),
}

export const D_ChatWithSources: Story = {
  name: '2(d) A turn that returned a lot',
  render: () => <ChatWithSourcesScreen />,
}

export const E_PlanSheet: Story = {
  name: '2(e) The plan on its own',
  render: () => (
    <div className="flex flex-col">
      <PlanSheetScreen />
      <Annotation>
        Outline, references and quotes are stacked, never columned: inside a phase the eye
        should only have to travel one way. The bar beside the outline is the shape of the
        piece — 300 / 700 / 900 / 500 of 2,400.
      </Annotation>
    </div>
  ),
}

export const F_LedgerDrawer: Story = {
  name: '2(f) Source ledger',
  render: () => (
    <div className="flex flex-col">
      <LedgerDrawerScreen />
      <Annotation>
        The same list at every stage — early on most rows read "offered", later most read
        "used". That is precisely why there is no separate triage screen.
      </Annotation>
    </div>
  ),
}

export const G_LedgerPopover: Story = {
  name: '2(g) Ledger from the composer',
  render: () => (
    <div className="flex flex-col">
      <LedgerPopoverScreen />
      <Annotation>
        The groups are the lifecycle and their order is fixed, so the undecided pile at
        the bottom visibly shrinks as you work.
      </Annotation>
    </div>
  ),
}
