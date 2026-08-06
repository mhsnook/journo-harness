import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Button } from './Button'
import { Check } from './Check'
import { Chip } from './Chip'
import { CoachNote, NoteDot } from './CoachNote'
import { EmptySlot, Field } from './Field'
import { LengthBar } from './LengthBar'
import { PaneRail, type PaneId } from './PaneRail'
import { ProgressBar } from './ProgressBar'
import { QuoteRow } from './QuoteRow'
import { SourceCard } from './SourceCard'
import { ExampleBlock, PolarityHeading } from './ExampleBlock'
import { OutlineRow } from './OutlineRow'
import { outline, quotes, sources } from '../mock/content'

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
      <Row label="Button tones">
        <Button tone="accent">start drafting →</Button>
        <Button>download</Button>
        <Button tone="quiet">cut</Button>
        <Button tone="link">see all drafts</Button>
      </Row>
      <Row label="Chips">
        <Chip tone="accent">review ready</Chip>
        <Chip>700w</Chip>
        <Chip tone="outline">well researched</Chip>
        <Chip tone="muted">—</Chip>
        <Chip dimmed>cut</Chip>
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
        <EmptySlot className="w-72">Tick a source in the chat</EmptySlot>
      </Row>
    </div>
  ),
}

export const PaneToggle: Story = {
  render: function PaneToggleStory() {
    const [open, setOpen] = useState<PaneId[]>(['plan', 'draft'])
    return (
      <div className="flex w-[40rem] flex-col gap-4">
        <PaneRail
          open={open}
          onToggle={(pane) =>
            setOpen((current) =>
              current.includes(pane) ? current.filter((p) => p !== pane) : [...current, pane],
            )
          }
        />
        <p className="text-[0.8125rem] text-muted">
          Open: {open.length ? open.join(' · ') : 'nothing — the app would keep the draft up'}
        </p>
      </div>
    )
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
          segments={outline.map((s) => ({ label: s.title, words: s.words, state: s.state }))}
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
      <SourceCard source={sources[0]} />
      <SourceCard source={sources[2]} variant="ledger" />
      <SourceCard source={sources[4]} variant="ledger" compact />
      <QuoteRow quote={quotes[0]} showUsage />
      <QuoteRow quote={quotes[2]} showUsage />
    </div>
  ),
}

export const Notes: Story = {
  render: () => (
    <div className="flex w-[16rem] flex-col gap-3">
      <CoachNote
        anchor="§3"
        confidence="confident"
        live
        title="You're restating §2"
        body="You're supposed to be moving into the human cost."
        actions={
          <>
            <Chip tone="outline" interactive>
              accept
            </Chip>
            <Chip tone="muted" interactive>
              dismiss
            </Chip>
          </>
        }
      />
      <CoachNote
        anchor="whole piece"
        confidence="tentative"
        title="220 words over target"
        body="With §4 still to write, something in §3 has to give."
      />
      <CoachNote title="Attribute the £4,100 figure in-sentence" accepted />
      <NoteDot count={3} className="self-start" />
    </div>
  ),
}

export const PlanPieces: Story = {
  render: () => (
    <div className="flex w-[26rem] flex-col gap-4">
      <OutlineRow section={outline[1]} />
      <OutlineRow section={outline[2]} current />
      <OutlineRow section={outline[3]} dense />
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
