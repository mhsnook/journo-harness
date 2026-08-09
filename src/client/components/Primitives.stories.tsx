import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent, within } from 'storybook/test'

import { offers, plan, sectionState } from '../mock/content'
import { Button } from './Button'
import { ChatComposer } from './Chat'
import { Check } from './Check'
import { Chip } from './Chip'
import { Divider } from './Divider'
import { ExampleBlock, PolarityHeading } from './ExampleBlock'
import { EmptySlot, Field } from './Field'
import { GuidanceNote, NoteDot } from './GuidanceNote'
import { LengthBar } from './LengthBar'
import { OutlineRow } from './OutlineRow'
import { PanelRail, type PanelId } from './PanelRail'
import { ProgressBar } from './ProgressBar'
import { QuoteRow } from './QuoteRow'
import { ReferenceCard } from './ReferenceCard'

const meta = {
	title: 'Primitives/Overview',
	parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function Row({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-2 border-b border-rule py-4 last:border-b-0">
			<p className="label-meta">{label}</p>
			<div className="flex flex-wrap items-center gap-3">{children}</div>
		</div>
	)
}

export const Buttons: Story = {
	render: () => (
		<div className="w-[40rem]">
			<Row label="Button variants">
				<Button variant="accent">start drafting →</Button>
				<Button>download</Button>
				<Button variant="quiet">declined</Button>
				<Button variant="link">see all drafts</Button>
			</Row>
			<Row label="Chips">
				<Chip variant="accent">review ready</Chip>
				<Chip>700w</Chip>
				<Chip variant="outline">well researched</Chip>
				<Chip variant="muted">—</Chip>
				<Chip dimmed>declined</Chip>
			</Row>
			<Row label="Check — accepting is the decision these lists ask for">
				<Check />
				<Check checked />
			</Row>
			<Row label="Fields">
				<Field label="Length" value="2,400 words" className="w-64" />
				<Field label="Length" placeholder="words —" className="w-64" />
			</Row>
			<Row label="Empty slot — dashed always means optional and unfilled">
				<EmptySlot className="w-72">Tick a reference in the chat</EmptySlot>
			</Row>
		</div>
	),
}

export const PanelToggle: Story = {
	render: function PanelToggleStory() {
		const [open, setOpen] = useState<PanelId[]>(['plan', 'draft'])
		return (
			<div className="flex w-[40rem] flex-col gap-4">
				<PanelRail
					open={open}
					onToggle={(Panel) =>
						setOpen((current) =>
							current.includes(Panel)
								? current.filter((p) => p !== Panel)
								: [...current, Panel],
						)
					}
				/>
				<p className="text-[0.8125rem] text-muted">
					Open:{' '}
					{open.length ? open.join(' · ') : 'nothing — the app would keep the draft up'}
				</p>
			</div>
		)
	},
}

export const Composer: Story = {
	render: function ComposerStory() {
		const [sent, setSent] = useState<string[]>([])

		return (
			<div className="flex w-[26rem] flex-col gap-4">
				<Row label="Chat composer — Enter sends, shift-Enter breaks the line">
					<ChatComposer
						onSend={(text) => setSent((held) => [...held, text])}
						className="w-full"
					/>
				</Row>
				<ul aria-label="Sent" className="flex flex-col gap-1">
					{sent.map((text, index) => (
						<li
							key={index}
							className="rounded-md bg-hush px-3 py-2 text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-ink"
						>
							{text}
						</li>
					))}
				</ul>
			</div>
		)
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		const field = canvas.getByLabelText('Message the guide') as HTMLTextAreaElement

		// Shift-Enter breaks the line and sends nothing.
		await userEvent.click(field)
		await userEvent.keyboard('one{Shift>}{Enter}{/Shift}two')
		await expect(field.value).toBe('one\ntwo')
		await expect(
			within(canvas.getByLabelText('Sent')).queryAllByRole('listitem'),
		).toHaveLength(0)

		// Enter sends what is in the field, newline and all, and empties it back to
		// one line.
		await userEvent.keyboard('{Enter}')
		await expect(field.value).toBe('')
		await expect(canvas.getByRole('listitem')).toHaveTextContent('one two')
	},
}

export const Progress: Story = {
	render: () => (
		<div className="w-[24rem]">
			<Row label="Quiet — under target">
				<ProgressBar value={0.62} className="w-full" />
			</Row>
			<Row label="Attention — over target">
				<ProgressBar value={1.18} className="w-full" />
			</Row>
			<Row label="Length bar — the shape of the piece">
				<LengthBar
					segments={plan.outline.map((node) => ({
						label: node.title,
						words: node.target ?? 0,
						state: sectionState[node.id],
					}))}
					height={160}
					accentCurrent
				/>
			</Row>
		</div>
	),
}

export const Research: Story = {
	render: () => (
		<div className="flex w-[34rem] flex-col gap-4">
			{/* Undecided, so the Chat card shows the two rulings it offers. */}
			<ReferenceCard offer={offers[3]} favourite="publication" />
			<ReferenceCard offer={offers[0]} />
			<ReferenceCard offer={offers[2]} variant="ledger" />
			<ReferenceCard offer={offers[4]} variant="ledger" compact />
			<ReferenceCard offer={offers[6]} variant="ledger" compact />
			<Divider />
			<p className="max-w-[28rem] text-[0.75rem] leading-relaxed text-muted">
				<strong>The QuoteRow component (2 examples below) is unused.</strong> It was added
				to show a read-only summary of the Plan Panel, which we stopped using, but may go
				back to in Phase 2.
			</p>
			<QuoteRow reference={plan.references[2]} section="§2" showUsage />
			<QuoteRow reference={plan.references[3]} showUsage />
		</div>
	),
}

export const Notes: Story = {
	render: () => (
		<div className="flex w-[16rem] flex-col gap-3">
			<GuidanceNote
				anchor="§3"
				confidence="confident"
				live
				title="You're restating §2"
				body="You're supposed to be moving into the human cost."
				actions={
					<>
						<Chip variant="outline" interactive>
							accept
						</Chip>
						<Chip variant="muted" interactive>
							dismiss
						</Chip>
					</>
				}
			/>
			<GuidanceNote
				anchor="whole piece"
				confidence="tentative"
				title="220 words over target"
				body="With §4 still to write, something in §3 has to give."
			/>
			<GuidanceNote title="Attribute the £4,100 figure in-sentence" accepted />
			<NoteDot count={3} className="self-start" />
		</div>
	),
}

export const PlanPieces: Story = {
	render: () => (
		<div className="flex w-[26rem] flex-col gap-4">
			<OutlineRow node={plan.outline[1]} ordinal="2" />
			<OutlineRow node={plan.outline[2]} ordinal="3" current />
			<OutlineRow node={plan.outline[3]} ordinal="4" dense />
			<div className="flex flex-col gap-2 pt-2">
				<PolarityHeading polarity="yes" count={3}>
					Sounds like this
				</PolarityHeading>
				<ExampleBlock
					polarity="yes"
					text="In 2006 the number was thirty-one. Last spring it was four."
					source="Why Cities Stopped Building, §1"
				/>
				<PolarityHeading polarity="no" count={2}>
					Not this
				</PolarityHeading>
				<ExampleBlock
					polarity="no"
					text="The situation is, frankly, an absolute disaster!"
					reason="just loud"
				/>
			</div>
		</div>
	),
}
