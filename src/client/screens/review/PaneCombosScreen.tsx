import { Frame, FrameBody } from '../../components/Frame'
import { PaneRail, type PaneId } from '../../components/PaneRail'
import { cx } from '../../lib/cx'

interface Combo {
  open: PaneId[]
  widths: Array<{ pane: PaneId; flex: number }>
}

const combos: Combo[] = [
  {
    open: ['chat', 'plan'],
    widths: [
      { pane: 'chat', flex: 1 },
      { pane: 'plan', flex: 1 },
    ],
  },
  {
    open: ['plan', 'draft'],
    widths: [
      { pane: 'plan', flex: 0.38 },
      { pane: 'draft', flex: 1 },
    ],
  },
  {
    open: ['draft', 'notes'],
    widths: [
      { pane: 'draft', flex: 1 },
      { pane: 'notes', flex: 0.26 },
    ],
  },
  {
    open: ['chat', 'notes'],
    widths: [
      { pane: 'chat', flex: 0.5 },
      { pane: 'notes', flex: 0.5 },
    ],
  },
  {
    open: ['plan', 'draft', 'notes'],
    widths: [
      { pane: 'plan', flex: 0.24 },
      { pane: 'draft', flex: 1 },
      { pane: 'notes', flex: 0.24 },
    ],
  },
]

/**
 * 4(e) — Recap: which panes can be open at once. Order never changes, panes
 * never stack, and the two support panes are always the narrow ones.
 */
export function PaneCombosScreen() {
  return (
    <Frame width={360}>
      <FrameBody className="gap-4 p-4">
        {combos.map((combo, i) => (
          <div key={i} className="flex flex-col gap-2">
            <PaneRail open={combo.open} />
            <div className="flex h-10 overflow-hidden rounded-md border border-edge">
              {combo.widths.map(({ pane, flex }, j) => (
                <div
                  key={pane}
                  style={{ flex }}
                  className={cx(
                    'grid place-items-center text-[0.625rem] text-faint',
                    j > 0 && 'border-l border-edge',
                    pane === 'draft' ? 'bg-surface' : 'bg-sunk',
                  )}
                >
                  {pane}
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="text-[0.6875rem] leading-relaxed text-faint">
          Notes is always the narrow one. Plan collapses to a rail when the draft is up.
          Draft alone is the sixth state, and the most common.
        </p>
      </FrameBody>
    </Frame>
  )
}
