import { cx } from '../lib/cx'
import { Chip } from './Chip'
import type { OutlineSection } from '../mock/content'

export interface OutlineRowProps {
  section: OutlineSection
  /** Marks the section being written; renders a quiet "now" flag. */
  current?: boolean
  /** Accent the word count — used when a review has just changed it. */
  changed?: boolean
  /** Drop the chips and run as a single line. */
  dense?: boolean
  className?: string
}

/** One row of the outline: number, title, target, and any tone instructions. */
export function OutlineRow({
  section,
  current = false,
  changed = false,
  dense = false,
  className,
}: OutlineRowProps) {
  return (
    <div className={cx('flex items-start gap-2.5', className)}>
      <span className="mt-px w-3 shrink-0 font-mono text-[0.6875rem] text-faint">{section.n}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span
            className={cx(
              'min-w-0 text-[0.8125rem] leading-snug',
              current ? 'font-medium text-ink' : 'text-ink',
              dense && 'truncate',
            )}
          >
            {section.title}
          </span>
          {current ? <span className="shrink-0 text-[0.6875rem] text-faint">now</span> : null}
          {dense ? (
            <Chip tone={changed ? 'accent' : 'default'} className="ml-auto">
              {section.words}w
            </Chip>
          ) : null}
        </div>
        {!dense ? (
          <div className="flex flex-wrap gap-1.5">
            <Chip tone={changed ? 'accent' : 'default'}>{section.words}w</Chip>
            {section.adjectives?.map((adjective) => (
              <Chip key={adjective} tone="outline">
                {adjective}
              </Chip>
            ))}
            {section.voice ? <Chip tone="outline">voice: {section.voice}</Chip> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
