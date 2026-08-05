import type { ReactNode } from 'react'
import { cx } from '../lib/cx'

export interface FieldProps {
  label?: ReactNode
  value?: ReactNode
  placeholder?: string
  /** Right-hand adornment: a unit, a chip, a score. */
  suffix?: ReactNode
  size?: 'sm' | 'md'
  className?: string
}

/** A read-only input frame — the showcase does not wire up editing. */
export function Field({ label, value, placeholder, suffix, size = 'md', className }: FieldProps) {
  const empty = value === undefined || value === null || value === ''
  return (
    <div className={cx('flex items-center gap-2.5', className)}>
      {label ? (
        <span className="shrink-0 text-[0.8125rem] font-medium text-muted">{label}</span>
      ) : null}
      <div
        className={cx(
          'flex flex-1 items-center gap-2 rounded-md border border-edge bg-surface px-2.5',
          size === 'sm' ? 'h-7 text-[0.75rem]' : 'h-8 text-[0.8125rem]',
        )}
      >
        <span className={cx('min-w-0 flex-1 truncate', empty ? 'text-faint' : 'text-ink')}>
          {empty ? placeholder : value}
        </span>
        {suffix}
      </div>
    </div>
  )
}

export interface EmptySlotProps {
  children: ReactNode
  className?: string
}

/**
 * A dashed placeholder. In this design dashed always means "optional, and not
 * filled in yet" — it is never a disabled state.
 */
export function EmptySlot({ children, className }: EmptySlotProps) {
  return (
    <div
      className={cx(
        'flex items-center justify-center rounded-md border border-dashed border-edge px-3 py-2.5 text-center text-[0.75rem] text-faint',
        className,
      )}
    >
      {children}
    </div>
  )
}
