import { cx } from '../lib/cx'

export const PANES = ['chat', 'plan', 'draft', 'notes'] as const
export type PaneId = (typeof PANES)[number]

export interface PaneRailProps {
  /** Which panes are on screen. Order is always chat → plan → draft → notes. */
  open: readonly PaneId[]
  /** Omit to render the rail as a static indicator. */
  onToggle?: (pane: PaneId) => void
  className?: string
}

/**
 * The four-pane toggle: chat · plan · draft · notes.
 *
 * Deliberately *not* accented. Which panes are open is state, not a call to
 * action, so the active pill is solid ink and the yellow stays free for the
 * one thing on screen that actually wants a decision.
 */
export function PaneRail({ open, onToggle, className }: PaneRailProps) {
  return (
    <div
      className={cx(
        'flex shrink-0 items-center gap-0.5 rounded-full border border-edge bg-sunk p-0.5',
        className,
      )}
      role={onToggle ? 'group' : undefined}
      aria-label={onToggle ? 'Visible panes' : undefined}
    >
      {PANES.map((pane) => {
        const isOpen = open.includes(pane)
        const Tag = (onToggle ? 'button' : 'span') as 'button'
        return (
          <Tag
            key={pane}
            {...(onToggle
              ? {
                  type: 'button' as const,
                  onClick: () => onToggle(pane),
                  'aria-pressed': isOpen,
                }
              : {})}
            className={cx(
              'rounded-full px-2.5 py-1 text-[0.6875rem] leading-none font-medium transition-colors',
              isOpen ? 'bg-ink text-paper' : 'text-faint',
              onToggle && !isOpen && 'hover:bg-hush hover:text-muted',
            )}
          >
            {pane}
          </Tag>
        )
      })}
    </div>
  )
}
