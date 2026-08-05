import { Chip } from '../../components/Chip'
import { Frame, FrameBody } from '../../components/Frame'
import { MetaLabel } from '../../components/MetaLabel'
import { TitleBar } from '../../components/TitleBar'
import { cx } from '../../lib/cx'
import { ARTICLE_TITLE } from '../../mock/content'

const layers = [
  {
    n: 1,
    name: 'Chat',
    body: 'Research and suggestions. Nothing it produces reaches the prose directly.',
    flex: 1,
    accent: false,
  },
  {
    n: 2,
    name: 'Plan & sources',
    body: 'Outline, targets, voices, references, quotes. Editable by hand at any time.',
    flex: 1.15,
    accent: false,
  },
  { n: 3, name: 'Draft', body: 'The human writes. Only the human writes.', flex: 1, accent: false },
  {
    n: 4,
    name: 'Coach',
    body: 'Reads 3 against 2 and returns notes, which feed back into 2.',
    flex: 1,
    accent: true,
  },
]

const arrows = ['builds', 'guides', 'feeds back']

const states: Array<{ label: string; on: number[] }> = [
  { label: 'Planning — chat, approving into the plan as you go', on: [1, 2] },
  { label: '"I\'m done" — the plan alone, zoomed, fill in the blanks', on: [2] },
  { label: 'Drafting — most of the time, this alone', on: [3] },
  { label: 'Checking myself against the plan', on: [2, 3] },
  { label: 'Drafting + coach — after a pause, or on demand', on: [3, 4] },
  { label: 'Review round — back to chat, the self-crit lands in layer 2', on: [1, 2] },
]

/**
 * 4(f) — Recap: what moves between the four panes. One horizontal rail; layers
 * slide in and out beside each other and never stack.
 */
export function LayersRecapScreen() {
  return (
    <Frame width={800}>
      <TitleBar title={ARTICLE_TITLE} subtitle="one horizontal rail · layers slide, never stack" />
      <FrameBody className="gap-5 p-4">
        <div className="flex items-stretch">
          {layers.map((layer, i) => (
            <div key={layer.n} className="flex items-stretch" style={{ flex: layer.flex }}>
              {i > 0 ? (
                <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-1 px-1">
                  <span className="text-center text-[0.5625rem] leading-tight text-faint">
                    {arrows[i - 1]}
                  </span>
                  <span aria-hidden className="text-[0.75rem] text-faint">
                    →
                  </span>
                </div>
              ) : null}
              <div
                className={cx(
                  'flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg border p-2.5',
                  layer.accent ? 'border-accent-edge bg-accent-soft' : 'border-edge bg-sunk',
                )}
              >
                <MetaLabel>Layer {layer.n}</MetaLabel>
                <h3 className="text-[0.875rem] font-semibold text-ink">{layer.name}</h3>
                <p className="text-[0.6875rem] leading-relaxed text-muted">{layer.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <MetaLabel>What's on screen, when</MetaLabel>
          {states.map((state) => (
            <div key={state.label} className="flex items-center gap-3">
              <div className="flex w-[8.5rem] shrink-0 gap-0.5">
                {layers.map((layer) => (
                  <span
                    key={layer.n}
                    style={{ flex: layer.flex }}
                    className={cx(
                      'h-2.5 rounded-sm',
                      state.on.includes(layer.n) ? 'bg-accent' : 'bg-rule',
                    )}
                  />
                ))}
              </div>
              <span className="text-[0.75rem] text-muted">{state.label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="outline">outline</Chip>
          <Chip tone="outline">voices</Chip>
          <Chip tone="outline">refs</Chip>
          <span className="text-[0.6875rem] text-faint">
            everything the coach knows about this piece lives in layer 2 — which is why editing it
            by hand changes the advice
          </span>
        </div>
      </FrameBody>
    </Frame>
  )
}
