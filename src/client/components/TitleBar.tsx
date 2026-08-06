import type { ReactNode } from 'react'
import { cx } from '../lib/cx'

export interface TitleBarProps {
  /** Renders a back affordance ahead of the title. */
  back?: string
  onBack?: () => void
  title: ReactNode
  /** Quiet text after the title — "· board", "· all articles". */
  subtitle?: ReactNode
  /** Right-hand side: buttons, pane pills, filters. */
  actions?: ReactNode
  className?: string
}

/**
 * The window's title bar. Back on the left, then the title, with actions
 * pushed right. The rule underneath is the heavier of the two hairline
 * weights — it separates chrome from content.
 */
export function TitleBar({
  back,
  onBack,
  title,
  subtitle,
  actions,
  className,
}: TitleBarProps) {
  return (
    <header
      className={cx(
        'flex shrink-0 items-center gap-2.5 border-b border-edge bg-sunk px-4 py-2.5',
        className,
      )}
    >
      {back ? (
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 flex items-center gap-1.5 rounded px-1 py-0.5 text-[0.8125rem] text-muted transition-colors hover:text-ink"
        >
          <span aria-hidden className="text-[0.9em] leading-none">
            ←
          </span>
          <span className="max-w-[16rem] truncate">{back}</span>
        </button>
      ) : null}
      <h2 className="truncate text-[0.9375rem] leading-tight font-medium text-ink">
        {title}
      </h2>
      {subtitle ? (
        <span className="truncate text-[0.8125rem] text-faint">{subtitle}</span>
      ) : null}
      <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>
    </header>
  )
}
