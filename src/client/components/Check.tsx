import { cx } from '../lib/cx'

export interface CheckProps {
	checked?: boolean
	onChange?: (checked: boolean) => void
	label?: string
	className?: string
}

/**
 * The square tick used for accepting a Reference, an Offer, or a Guidance note.
 *
 * Checked is the accented state — accepting something is the one decision
 * these lists are asking for, so the yellow belongs here.
 */
export function Check({ checked = false, onChange, label, className }: CheckProps) {
	return (
		<button
			type="button"
			role="checkbox"
			aria-checked={checked}
			aria-label={label}
			onClick={() => onChange?.(!checked)}
			disabled={!onChange}
			className={cx(
				'mt-[0.1875rem] grid size-[0.9375rem] shrink-0 place-items-center rounded-[0.25rem] border transition-colors',
				checked
					? 'border-accent-edge bg-accent text-accent-ink'
					: 'border-edge bg-surface text-transparent',
				onChange && !checked && 'hover:border-ink/40',
				className,
			)}
		>
			<svg viewBox="0 0 10 10" aria-hidden className="size-[0.5rem]" fill="none">
				<path
					d="M1 5.2 3.6 8 9 1.8"
					stroke="currentColor"
					strokeWidth="1.8"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</button>
	)
}
