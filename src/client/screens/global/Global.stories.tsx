import type { Meta, StoryObj } from '@storybook/react-vite'

import { Annotation } from '../../components/Annotation'
import { AdjectivesScreen } from './AdjectivesScreen'
import { BoardScreen } from './BoardScreen'
import { DeskScreen } from './DeskScreen'
import { FavouriteSourcesScreen } from './FavouriteSourcesScreen'
import { TableScreen } from './TableScreen'
import { VoicesScreen } from './VoicesScreen'

const meta = {
  title: 'Screens/1 Global',
  parameters: {
    layout: 'centered',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const A_Desk: Story = {
  name: '1(a) Desk',
  render: () => (
    <div className="flex flex-col">
      <DeskScreen />
      <Annotation>
        The root screen. Board and table both back-button here, so this is the only page
        that needs a "board view" button — the table is reached from the quiet "see all"
        links, with the filter already set, because it is a fallback utility rather than
        an attraction.
      </Annotation>
    </div>
  ),
}

export const B_Board: Story = {
  name: '1(b) Board',
  render: () => <BoardScreen />,
}

export const C_Table: Story = {
  name: '1(c) Table',
  render: () => <TableScreen />,
}

export const D_Voices: Story = {
  name: '1(d) Settings · voices',
  render: () => (
    <div className="flex flex-col">
      <VoicesScreen />
      <Annotation>
        The test row at the bottom takes a pasted paragraph and scores it. An exemplary
        paragraph should score very high — if it doesn't, the rule above is the thing that
        needs rewriting.
      </Annotation>
    </div>
  ),
}

export const E_Adjectives: Story = {
  name: '1(e) Settings · adjectives',
  render: () => (
    <div className="flex flex-col">
      <AdjectivesScreen />
      <Annotation>
        Same shell as voices, deliberately. An adjective is just a fuzzier voice: you
        define what "high energy" means once, and then any section can be marked with it.
      </Annotation>
    </div>
  ),
}

export const F_FavouriteSources: Story = {
  name: '1(f) Settings · favourite sources',
  render: () => (
    <div className="flex flex-col">
      <FavouriteSourcesScreen />
      <Annotation>
        Ranking, not filtering — a non-favourite still shows up when it is the best
        evidence available.
      </Annotation>
    </div>
  ),
}
