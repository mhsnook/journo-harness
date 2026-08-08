import type { Plan, Refusal } from '../../shared/plan'
import { Button } from '../components/Button'
import { cx } from '../lib/cx'
import { refusalText } from '../plan/refusalText'
import { describeProposal, type ProposalCall } from './proposals'

/**
 * One suspended Proposal, for the writer to Accept or Decline —
 * docs/architecture.md §6. Accepting applies the ops through the Plan's one
 * writer; Declining answers the tool call with the reason.
 *
 * **A refused Proposal says why.** Whole-field `expected` comparison is
 * conservative and will refuse a Proposal against a field the writer has since
 * touched, so a card that just greyed out would be a card the writer cannot
 * account for. The applier writes that sentence; this renders it.
 */

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
				<p className="text-[0.8125rem] leading-snug text-ink">
					This Proposal did not parse, so there is nothing to Accept. {call.unreadable}
				</p>
			)}

			{refusal === null ? null : (
				<p className="rounded-md border border-accent-edge bg-accent-soft p-2 text-[0.75rem] text-accent-ink">
					{refusalText(plan, refusal)} Decline to send that back, or edit the Plan and
					Accept again.
				</p>
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
