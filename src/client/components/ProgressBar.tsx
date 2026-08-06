import { cx } from '../lib/cx'

export interface ProgressBarProps {
	/** 0–1. Values above 1 clamp the fill but flip the tone to `attention`. */
	value: number
	/** `attention` is the accented state — used when you are over target. */
	tone?: 'quiet' | 'attention'
	thickness?: number
	label?: string
	className?: string
}

/**
 * Progress against a word target, shown as a bar rather than a number.
 * The secondary user wants "some sense of completion… a subtle bar someplace,
 * not numbers that change" — so this never renders a percentage.
 */
export function ProgressBar({
	value,
	tone = 'quiet',
	thickness = 3,
	label,
	className,
}: ProgressBarProps) {
	const over = value > 1
	const filled = Math.max(0, Math.min(1, value))
	const accented = tone === 'attention' || over

	return (
		<div
			className={cx('w-full overflow-hidden rounded-full bg-rule', className)}
			style={{ height: thickness }}
			role="progressbar"
			aria-valuenow={Math.round(filled * 100)}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-label={label}
		>
			<div
				className={cx('h-full rounded-full', accented ? 'bg-accent-edge' : 'bg-ink/30')}
				style={{ width: `${filled * 100}%` }}
			/>
		</div>
	)
}
