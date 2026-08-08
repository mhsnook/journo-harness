import { useArticle } from '../lib/article'
import { PlanPanel } from './PlanPanel'

/** Drives `PlanPanel` from the connection the `ArticleProvider` holds. */

export interface ArticlePlanPanelProps {
	className?: string
}

export function ArticlePlanPanel({ className }: ArticlePlanPanelProps) {
	const { plan, edit, refusal, rejected } = useArticle().plan

	// Says what it waits on rather than drawing a skeleton, since the socket
	// settles well inside a second.
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
