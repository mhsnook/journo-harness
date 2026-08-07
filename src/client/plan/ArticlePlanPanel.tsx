import { PlanPanel } from './PlanPanel'
import { usePlan } from './usePlan'

/**
 * The Plan Panel, wired to one Article Agent. Mounting it inside the Article
 * screen is issue #29; everything it needs from the socket is `usePlan`.
 */

export interface ArticlePlanPanelProps {
	/** The Article Agent's name, which is the Article's id. */
	articleId: string
	className?: string
}

export function ArticlePlanPanel({ articleId, className }: ArticlePlanPanelProps) {
	const { plan, edit, refusal, rejected } = usePlan(articleId)

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
