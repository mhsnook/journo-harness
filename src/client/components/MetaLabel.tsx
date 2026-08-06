import type { ReactNode } from 'react'
import { cx } from '../lib/cx'

export interface MetaLabelProps {
  children: ReactNode
  /** A trailing count: "STRUCTURE · 2". */
  count?: number | string
  className?: string
}

/** The small uppercase mono label that heads a list or a group. */
export function MetaLabel({ children, count, className }: MetaLabelProps) {
  return (
    <div className={cx('label-meta', className)}>
      {children}
      {count !== undefined ? <span> · {count}</span> : null}
    </div>
  )
}
