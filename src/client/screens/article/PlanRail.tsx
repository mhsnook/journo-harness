import { Chip } from '../../components/Chip'
import { ProgressBar } from '../../components/ProgressBar'
import { cx } from '../../lib/cx'
import type { OutlineSection } from '../../mock/content'

export interface PlanRailProps {
	sections: OutlineSection[]
	/** Written words per section, in the same order. */
	written: number[]
	/** Chips at the foot of the rail: refs, quotes, notes. */
	counts?: string[]
	className?: string
}

/**
 * The plan collapsed to a rail beside the draft. Section titles, one quiet bar
 * each, and a whole-piece bar at the bottom — the secondary user wants a sense
 * of completion without a number that twitches on every keystroke.
 */
export function PlanRail({ sections, written, counts, className }: PlanRailProps) {
	const target = sections.reduce((sum, section) => sum + section.words, 0)
	const done = written.reduce((sum, n) => sum + n, 0)

	return (
		<aside
			className={cx(
				'flex w-[11rem] shrink-0 flex-col gap-3.5 border-r border-edge bg-sunk p-3.5',
				className,
			)}
		>
			{sections.map((section, i) => {
				const current = section.state === 'current'
				return (
					<div key={section.n} className="flex flex-col gap-1.5">
						<div className="flex items-baseline gap-1.5">
							<p
								className={cx(
									'min-w-0 flex-1 text-[0.75rem] leading-snug',
									current ? 'font-medium text-ink' : 'text-muted',
								)}
							>
								{section.title}
							</p>
							{current ? <span className="text-[0.625rem] text-faint">now</span> : null}
						</div>
						<ProgressBar
							value={written[i] / section.words}
							label={`${section.title} progress`}
							tone={written[i] / section.words > 1 ? 'attention' : 'quiet'}
						/>
					</div>
				)
			})}

			<div className="mt-auto flex flex-col gap-1.5">
				<ProgressBar value={done / target} thickness={5} label="Whole piece" />
				<p className="text-[0.6875rem] text-faint">whole piece</p>
			</div>

			{counts?.length ? (
				<div className="flex flex-wrap gap-1.5">
					{counts.map((count) => (
						<Chip key={count} tone="outline">
							{count}
						</Chip>
					))}
				</div>
			) : null}
		</aside>
	)
}
