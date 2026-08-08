import { ARTICLE_STATUSES, type ArticleStatus, statusLabel } from '../../shared/article'
import { cx } from '../lib/cx'

export interface StatusPickerProps {
	status: ArticleStatus
	onStatus: (status: ArticleStatus) => void
	className?: string
}

/**
 * Where the writer says how far along a piece is. Nothing infers it — 1a has no
 * Draft to measure — and this is the only control that sets it, which is why the
 * Board View has none: the writer is here when they decide the piece has moved
 * on, not over there looking at columns.
 */
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
