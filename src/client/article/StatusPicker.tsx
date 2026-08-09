import { ARTICLE_STATUSES, type ArticleStatus, statusLabel } from '../../shared/article'
import { cx } from '../lib/cx'

export interface StatusPickerProps {
	status: ArticleStatus
	onStatus: (status: ArticleStatus) => void
	className?: string
}

/** The only control that sets a status, which is why the Board View has none. */
export function StatusPicker({ status, onStatus, className }: StatusPickerProps) {
	return (
		<select
			aria-label="Status"
			className={cx(
				'rounded-full border border-edge bg-surface px-2 py-[0.1875rem] text-[0.6875rem] font-medium text-muted transition-colors hover:border-ink/30 hover:text-ink',
				className,
			)}
			onChange={(event) => onStatus(event.target.value as ArticleStatus)}
			value={status}
		>
			{ARTICLE_STATUSES.map((one) => (
				<option key={one} value={one}>
					{statusLabel[one]}
				</option>
			))}
		</select>
	)
}
