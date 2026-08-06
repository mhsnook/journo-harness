import type { Meta, StoryObj } from '@storybook/react-vite'

import { Annotation } from '../../components/Annotation'
import { ArchiveScreen } from './ArchiveScreen'
import { FinishScreen } from './FinishScreen'
import { ShowcaseScreen } from './ShowcaseScreen'

const meta = {
  title: 'Screens/5 Finish and archive',
  parameters: { layout: 'centered' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const A_Finish: Story = {
  name: '5(a) Finish, export, chase',
  render: () => (
    <div className="flex flex-col">
      <FinishScreen />
      <Annotation>
        Called "finish" rather than "export" on purpose — the last steps might include
        another review or a round of twenty-five candidate titles. This is the start of a
        checkout process, not the end of the piece.
      </Annotation>
    </div>
  ),
}

export const B_Archive: Story = {
  name: '6(a) Submitted → published',
  render: () => <ArchiveScreen />,
}

export const C_Showcase: Story = {
  name: '6(b) Public showcase',
  render: () => (
    <div className="flex flex-col">
      <ShowcaseScreen />
      <Annotation>
        Off by default; switched on per person in settings. Pieces appear only once marked
        published, and you choose which ones show.
      </Annotation>
    </div>
  ),
}
