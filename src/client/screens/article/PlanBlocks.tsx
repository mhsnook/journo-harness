import type { ReactNode } from 'react'

import type { OutlineNode, Reference } from '../../../shared/plan'
import { Chip } from '../../components/Chip'
import { EmptySlot, Field } from '../../components/Field'
import { OutlineRow } from '../../components/OutlineRow'
import { PanelHeader } from '../../components/Panel'
import { cx } from '../../lib/cx'
import { outlineEntries } from '../../plan/outline'

export interface PlanLengthProps {
	/** The Article's stored total, and null where none is stated. */
	total?: number | null
	voice?: string
}

/** The Article's target. Empty until the writer or the Chat puts a number in it. */
export function PlanLength({ total, voice }: PlanLengthProps) {
	return (
		<div className="flex items-center gap-2.5">
			<Field
				label="Length"
				size="sm"
				value={total ? `${total.toLocaleString()} words` : undefined}
				placeholder="words —"
			/>
			{voice ? <Chip variant="outline">voice: {voice}</Chip> : null}
		</div>
	)
}

export interface PlanBlockProps {
	title: string
	meta?: ReactNode
	children: ReactNode
	className?: string
}

export function PlanBlock({ title, meta, children, className }: PlanBlockProps) {
	return (
		<div className={cx('flex flex-col gap-2', className)}>
			<PanelHeader title={title} meta={meta} />
			{children}
		</div>
	)
}

export interface PlanOutlineProps {
	outline: readonly OutlineNode[]
	/** The Section being written. */
	currentId?: string
	/** A Section still being typed in by hand. */
	typing?: string
	dense?: boolean
	/** Accent the targets from this position in the Outline onward. */
	changedFrom?: number
	showAdd?: boolean
	className?: string
}

export function PlanOutline({
	outline,
	currentId,
	typing,
	dense = false,
	changedFrom,
	showAdd = false,
	className,
}: PlanOutlineProps) {
	const entries = outlineEntries(outline)

	return (
		<div className={cx('flex flex-col gap-2.5', className)}>
			{entries.map((entry) => (
				<OutlineRow
					key={entry.node.id}
					node={entry.node}
					ordinal={entry.ordinal}
					dense={dense}
					current={entry.node.id === currentId}
					changed={
						changedFrom !== undefined &&
						entry.depth === 0 &&
						entry.index + 1 >= changedFrom
					}
				/>
			))}
			{typing ? (
				<div className="flex items-start gap-2.5">
					<span className="mt-px w-3 shrink-0 font-mono text-[0.6875rem] text-faint">
						{entries.length + 1}
					</span>
					<div className="flex min-w-0 flex-1 flex-col gap-1">
						<div className="rounded-md border border-edge bg-surface px-2 py-1 text-[0.8125rem] text-ink">
							{typing}
							<span
								aria-hidden
								className="ml-0.5 inline-block h-[1em] w-px translate-y-[0.15em] bg-ink"
							/>
						</div>
						<p className="text-[0.6875rem] text-faint">typing here yourself</p>
					</div>
				</div>
			) : null}
			{showAdd ? <EmptySlot className="py-1.5">+ section</EmptySlot> : null}
		</div>
	)
}

export interface PlanReferencesProps {
	references: readonly Reference[]
	/** Marks the Reference that has just crossed over from the Chat. */
	justAddedId?: string
	/** What each entry is placed at, by Section id. */
	placedAt?: Record<string, string>
}

/**
 * The Plan's References. One list, and the type on the record says which kind
 * of entry a row is — a Quote carries a passage, and a Reference may carry one
 * without being a Quote.
 */
export function PlanReferences({
	references,
	justAddedId,
	placedAt,
}: PlanReferencesProps) {
	return (
		<div className="flex flex-col gap-1.5">
			{references.map((reference) => (
				<div
					key={reference.id}
					className={cx(
						'flex flex-col gap-0.5 rounded-md border p-2',
						reference.id === justAddedId
							? 'border-accent-edge bg-accent-soft'
							: 'border-edge bg-surface',
					)}
				>
					{reference.id === justAddedId ? (
						<p className="label-meta">★ just added</p>
					) : null}
					{reference.source?.title ? (
						<p className="text-[0.75rem] leading-snug font-medium text-ink">
							{reference.source.title}
						</p>
					) : null}
					{reference.text ? (
						<blockquote className="border-l-2 border-rule pl-2 text-[0.8125rem] leading-relaxed text-ink">
							“{reference.text}”
						</blockquote>
					) : null}
					<p className="text-[0.6875rem] text-faint">
						{[
							reference.type,
							reference.source?.publication,
							reference.source?.year,
							reference.nodeId === null
								? 'not placed'
								: (placedAt?.[reference.nodeId] ?? 'placed'),
						]
							.filter(Boolean)
							.join(' · ')}
					</p>
				</div>
			))}
		</div>
	)
}
