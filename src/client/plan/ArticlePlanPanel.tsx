import { Panel } from '../components/Panel'
import { useArticle } from '../lib/article'
import { PlanPanel, type PlanPanelProps } from './PlanPanel'

/** Drives `PlanPanel` from the connection the `ArticleProvider` holds. */

export interface ArticlePlanPanelProps {
	divider?: PlanPanelProps['divider']
	className?: string
}

export function ArticlePlanPanel({ divider, className }: ArticlePlanPanelProps) {
	const { plan, edit, refusal, rejected } = useArticle().plan

	// Says what it waits on rather than drawing a skeleton, since the socket
	// settles well inside a second.
	if (plan === null) {
		return (
			<Panel className={className} divider={divider} variant="sunk">
				<p className="text-[0.75rem] text-faint">Opening the Plan…</p>
			</Panel>
		)
	}

	return (
		<PlanPanel
			className={className}
			divider={divider}
			edit={edit}
			plan={plan}
			refusal={refusal}
			rejected={rejected}
		/>
	)
}
