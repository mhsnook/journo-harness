import type { ReactNode } from 'react'
import { Chip } from '../../components/Chip'
import { EmptySlot, Field } from '../../components/Field'
import { OutlineRow } from '../../components/OutlineRow'
import { PaneHeader } from '../../components/Pane'
import { QuoteRow } from '../../components/QuoteRow'
import { cx } from '../../lib/cx'
import type { OutlineSection, Quote, Source } from '../../mock/content'

export interface PlanLengthProps {
  words?: number
  voice?: string
}

/** The target. Empty until you or the agent puts a number in it. */
export function PlanLength({ words, voice }: PlanLengthProps) {
  return (
    <div className="flex items-center gap-2.5">
      <Field
        label="Length"
        size="sm"
        value={words ? `${words.toLocaleString()} words` : undefined}
        placeholder="words —"
      />
      {voice ? <Chip tone="outline">voice: {voice}</Chip> : null}
    </div>
  )
}

export interface PlanBlockProps {
  title: string
  meta?: ReactNode
  children: ReactNode
  className?: string
}

export function PlanBlock({ title, meta, children, className }: PlanBlockProps) {
  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <PaneHeader title={title} meta={meta} />
      {children}
    </div>
  )
}

export interface PlanOutlineProps {
  sections: OutlineSection[]
  /** A section still being typed in by hand. */
  typing?: string
  dense?: boolean
  changedFrom?: number
  showAdd?: boolean
  className?: string
}

export function PlanOutline({
  sections,
  typing,
  dense = false,
  changedFrom,
  showAdd = false,
  className,
}: PlanOutlineProps) {
  return (
    <div className={cx('flex flex-col gap-2.5', className)}>
      {sections.map((section) => (
        <OutlineRow
          key={section.n}
          section={section}
          dense={dense}
          current={section.state === 'current'}
          changed={changedFrom !== undefined && section.n >= changedFrom}
        />
      ))}
      {typing ? (
        <div className="flex items-start gap-2.5">
          <span className="mt-px w-3 shrink-0 font-mono text-[0.6875rem] text-faint">
            {sections.length + 1}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="rounded-md border border-edge bg-surface px-2 py-1 text-[0.8125rem] text-ink">
              {typing}
              <span
                aria-hidden
                className="ml-0.5 inline-block h-[1em] w-px translate-y-[0.15em] bg-ink"
              />
            </div>
            <p className="text-[0.6875rem] text-faint">typing here yourself</p>
          </div>
        </div>
      ) : null}
      {showAdd ? <EmptySlot className="py-1.5">+ section</EmptySlot> : null}
    </div>
  )
}

export interface PlanReferencesProps {
  sources: Source[]
  /** Marks the source that has just crossed over from the chat. */
  justAddedId?: string
}

export function PlanReferences({ sources, justAddedId }: PlanReferencesProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {sources.map((source) => (
        <div
          key={source.id}
          className={cx(
            'flex flex-col gap-0.5 rounded-md border p-2',
            source.id === justAddedId
              ? 'border-accent-edge bg-accent-soft'
              : 'border-edge bg-surface',
          )}
        >
          {source.id === justAddedId ? <p className="label-meta">★ just added</p> : null}
          <p className="text-[0.75rem] leading-snug font-medium text-ink">{source.title}</p>
          <p className="text-[0.6875rem] text-faint">
            {[source.outlet, source.year, source.section].filter(Boolean).join(' · ')}
          </p>
        </div>
      ))}
    </div>
  )
}

export interface PlanQuotesProps {
  quotes: Quote[]
  showUsage?: boolean
  footer?: ReactNode
}

export function PlanQuotes({ quotes, showUsage = false, footer }: PlanQuotesProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {quotes.map((quote) => (
        <QuoteRow key={quote.id} quote={quote} showUsage={showUsage} />
      ))}
      {footer ? <p className="text-[0.6875rem] text-faint">{footer}</p> : null}
    </div>
  )
}
