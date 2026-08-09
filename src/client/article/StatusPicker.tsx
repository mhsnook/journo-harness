import { ARTICLE_STATUSES, type ArticleStatus, statusLabel } from '../../shared/article'
import { chipClass } from '../components/Chip'

export interface StatusPickerProps {
	status: ArticleStatus
	onStatus: (status: ArticleStatus) => void
}

/** The only control that sets a status, which is why the Board View has none. */
export function StatusPicker({ status, onStatus }: StatusPickerProps) {
	return (
		<select
			aria-label="Status"
			className={chipClass('outline', true)}
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
