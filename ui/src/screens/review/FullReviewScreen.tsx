import { ArticleBar } from '../../components/ArticleBar'
import { Button } from '../../components/Button'
import { Check } from '../../components/Check'
import { Frame, FrameBody } from '../../components/Frame'
import { MetaLabel } from '../../components/MetaLabel'
import { Pane, PaneHeader } from '../../components/Pane'
import { ARTICLE_TITLE } from '../../mock/content'

interface Finding {
  id: string
  text: string
  anchor: string
  accepted?: boolean
}

const structure: Finding[] = [
  {
    id: 'f1',
    text: 'The crane-index image carries §1 and then carries §4 again. The second use costs you the ending.',
    anchor: '§1 ↔ §4',
  },
  {
    id: 'f2',
    text: 'The human cost arrives 600 words later than the plan puts it.',
    anchor: '§3',
    accepted: true,
  },
]

const other: Finding[] = [
  {
    id: 'f3',
    text: '§3 drifts into Newsletter aside — three asides in four paragraphs, where the piece is marked Reported feature.',
    anchor: 'voice',
  },
  {
    id: 'f4',
    text: 'Two of five planned quotes are unused, both in §3.',
    anchor: 'citations',
  },
]

function FindingRow({ finding }: { finding: Finding }) {
  return (
    <li className="flex items-start gap-2.5">
      <Check checked={finding.accepted} label={`Accept: ${finding.text}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-[0.8125rem] leading-relaxed text-ink">{finding.text}</p>
        <p className="text-[0.6875rem] text-faint">
          {finding.anchor}
          {finding.accepted ? ' · accepted' : ''}
        </p>
      </div>
    </li>
  )
}

/**
 * 4(a) — The in-depth review, full screen. This is the only pass that takes
 * the whole window: you asked for it, so it gets your attention once. What you
 * accept then lives in the notes rail while you write.
 */
export function FullReviewScreen() {
  return (
    <Frame width={720}>
      <ArticleBar title={ARTICLE_TITLE} open={['notes']} status="round 2" />
      <FrameBody>
        <Pane className="gap-4 p-5">
          <PaneHeader title="Review of draft 2" meta="2,610 words · 6 findings" />

          <div className="flex flex-col gap-1.5">
            <MetaLabel>The shape of it</MetaLabel>
            <p className="text-[0.8125rem] leading-relaxed text-muted">
              The reporting is doing its job and the middle is the strongest it has been. The piece
              is 210 words over target and the overrun is entirely in §3, which is also where the
              plan says the argument should be tightest.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <section className="flex flex-col gap-2.5">
              <MetaLabel count={2}>Structure</MetaLabel>
              <ul className="flex flex-col gap-2.5">
                {structure.map((finding) => (
                  <FindingRow key={finding.id} finding={finding} />
                ))}
              </ul>
            </section>
            <section className="flex flex-col gap-2.5">
              <MetaLabel>Voice · 1 · Citations · 3</MetaLabel>
              <ul className="flex flex-col gap-2.5">
                {other.map((finding) => (
                  <FindingRow key={finding.id} finding={finding} />
                ))}
              </ul>
            </section>
          </div>

          <div className="flex items-center gap-2.5 border-t border-edge pt-3.5">
            <Button tone="accent">keep 3, back to the draft →</Button>
            <Button>send notes to chat</Button>
          </div>
        </Pane>
      </FrameBody>
    </Frame>
  )
}
