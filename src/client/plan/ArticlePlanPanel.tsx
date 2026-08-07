import { useArticle } from '../lib/article'
import { PlanPanel } from './PlanPanel'

/**
 * The Plan Panel, reading the one Article Agent connection the
 * `ArticleProvider` holds. Laying it out beside the other three Panels is issue
 * #29.
 */

export interface ArticlePlanPanelProps {
	className?: string
}

export function ArticlePlanPanel({ className }: ArticlePlanPanelProps) {
	const { plan, edit, refusal, rejected } = useArticle().plan

	// The socket usually settles in well under a second, so this says what it is
	// waiting for rather than drawing a skeleton of the Panel.
	if (plan === null) {
		return (
			<div className={className}>
				<p className="p-3.5 text-[0.75rem] text-faint">Opening the Plan…</p>
			</div>
		)
	}

	return (
		<PlanPanel
			className={className}
			edit={edit}
			plan={plan}
			refusal={refusal}
			rejected={rejected}
		/>
	)
}
