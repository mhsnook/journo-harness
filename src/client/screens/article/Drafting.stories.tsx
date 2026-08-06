import type { Meta, StoryObj } from '@storybook/react-vite'

import { Annotation } from '../../components/Annotation'
import { ChatAndDraftScreen } from './ChatAndDraftScreen'
import { DraftOnlyScreen } from './DraftOnlyScreen'
import { MarginNotesScreen } from './MarginNotesScreen'
import { NotesRailScreen } from './NotesRailScreen'
import { PlanAndDraftScreen } from './PlanAndDraftScreen'

const meta = {
	title: 'Screens/3 Drafting',
	parameters: { layout: 'centered' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const A_PlanAndDraft: Story = {
	name: '3(a) Plan + draft',
	render: () => (
		<div className="flex flex-col">
			<PlanAndDraftScreen />
			<Annotation>
				For the writer who wants a sense of completion without watching a counter. Bars
				only — no numbers that change on every keystroke.
			</Annotation>
		</div>
	),
}

export const B_DraftOnly: Story = {
	name: '3(b) Draft alone',
	render: () => (
		<div className="flex flex-col">
			<DraftOnlyScreen />
			<Annotation align="right">
				The default state, and where most of the time goes. The dot appears only when you
				have gone idle and there is something worth reading — an urgent note after ~20
				seconds, an ordinary one after minutes.
			</Annotation>
		</div>
	),
}

export const C_ChatAndDraft: Story = {
	name: '3(c) Chat + draft',
	render: () => (
		<div className="flex flex-col">
			<ChatAndDraftScreen />
			<Annotation>
				The chat pane never takes more than half. Anything it produces lands in the plan,
				not in the prose — the writing stays yours.
			</Annotation>
		</div>
	),
}

export const D_MarginNotes: Story = {
	name: '3(d) Notes in the margin',
	render: () => <MarginNotesScreen />,
}

export const E_NotesRail: Story = {
	name: '3(e) Draft + notes rail',
	render: () => (
		<div className="flex flex-col">
			<NotesRailScreen />
			<Annotation>
				Accepting a note moves it out of the stack and into the checklist underneath,
				which is the list you actually work through.
			</Annotation>
		</div>
	),
}
