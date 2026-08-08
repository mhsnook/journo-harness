import type { Plan, Refusal } from '../../shared/plan'
import { Button } from '../components/Button'
import { Notice } from '../components/Notice'
import { cx } from '../lib/cx'
import { refusalText, unreadableText } from '../plan/refusalText'
import { describeProposal, type ProposalCall } from './proposals'

/** One suspended Proposal to Accept or Decline — §6. Renders its ops as
 * sentences, and the refusal if an Accept was turned down. */

export interface ProposalCardProps {
	call: ProposalCall
	plan: Plan
	/** Why the last Accept did not land, and null while it has not been tried. */
	refusal?: Refusal | null
	onAccept: () => void
	onDecline: () => void
	className?: string
}

export function ProposalCard({
	call,
	plan,
	refusal = null,
	onAccept,
	onDecline,
	className,
}: ProposalCardProps) {
	const changes = call.ops === null ? [] : describeProposal(plan, call.ops)

	return (
		<article
			className={cx(
				'flex flex-col gap-2 rounded-lg border border-accent-edge bg-surface p-2.5',
				className,
			)}
		>
			<h4 className="label-meta text-muted">
				Proposal · {changes.length === 1 ? '1 change' : `${changes.length} changes`}
			</h4>

			{call.unreadable === null ? (
				<ul className="flex list-none flex-col gap-1">
					{changes.map((change) => (
						<li key={change} className="text-[0.8125rem] leading-snug text-ink">
							{change}
						</li>
					))}
				</ul>
			) : (
				<p className="text-[0.8125rem] leading-snug text-ink">{unreadableText}</p>
			)}

			{refusal === null ? null : (
				<Notice>
					{refusalText(plan, refusal)} Decline to send that back, or edit the Plan and
					Accept again.
				</Notice>
			)}

			<div className="flex items-center gap-1.5">
				<Button size="sm" disabled={call.ops === null} onClick={onAccept}>
					Accept
				</Button>
				<Button size="sm" variant="quiet" onClick={onDecline}>
					Decline
				</Button>
			</div>
		</article>
	)
}
