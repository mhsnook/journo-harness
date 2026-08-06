import type { Meta, StoryObj } from '@storybook/react-vite'

import { Annotation } from '../../components/Annotation'
import { FullReviewScreen } from './FullReviewScreen'
import { LayersRecapScreen } from './LayersRecapScreen'
import { NotesToChatScreen } from './NotesToChatScreen'
import { PaneCombosScreen } from './PaneCombosScreen'
import { PhoneNotesScreen } from './PhoneNotesScreen'
import { ReviewRailScreen } from './ReviewRailScreen'

const meta = {
  title: 'Screens/4 Reviews',
  parameters: { layout: 'centered' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const A_FullReview: Story = {
  name: '4(a) In-depth review',
  render: () => (
    <div className="flex flex-col">
      <FullReviewScreen />
      <Annotation>
        Only this pass is full screen — you asked for it, so it gets the window once.
        Accepted findings then live in the notes rail while you write.
      </Annotation>
    </div>
  ),
}

export const B_ReviewRail: Story = {
  name: '4(b) Findings in the rail',
  render: () => <ReviewRailScreen />,
}

export const C_NotesToChat: Story = {
  name: '4(c) Notes sent to chat',
  render: () => (
    <div className="flex flex-col">
      <NotesToChatScreen />
      <Annotation>
        The loop: draft → review → accept notes → notes go to chat → the plan changes →
        draft again. Counts are restated against the new plan, so "3 of 5 quotes used"
        becomes "3 of 4" instead of standing as a permanent failure against a plan you
        have already moved on from.
      </Annotation>
    </div>
  ),
}

export const D_Phone: Story = {
  name: '4(d) On the phone',
  render: () => (
    <div className="flex flex-col">
      <PhoneNotesScreen />
      <Annotation>
        A form factor, not a phase. Read and triage; no writing happens here.
      </Annotation>
    </div>
  ),
}

export const E_PaneCombos: Story = {
  name: '4(e) Recap · pane combinations',
  render: () => <PaneCombosScreen />,
}

export const F_LayersRecap: Story = {
  name: '4(f) Recap · the four layers',
  render: () => <LayersRecapScreen />,
}
