import type { Note } from '../../shared/note'
import { Button } from '../components/Button'
import { cx } from '../lib/cx'
import { type AnchorNaming, anchorLabel } from './anchors'

/**
 * One Note, wherever it is read. The written response and the queue both draw
 * this, so a Note cannot look like two different things or be ruled on two
 * different ways depending on which surface the writer is looking at.
 *
 * The body is short by design — the Round's prose carries the argument, and the
 * Note is the marker that pins it to a place in the piece.
 */

export interface NoteCardProps {
	note: Note
	naming: AnchorNaming
	/** The queue's running number: "01". The response numbers nothing, because
	 * the tranche it sits in is the grouping there. */
	ordinal?: number
	onAccept: (note: Note) => void
	onDismiss: (note: Note) => void
	onResolve: (note: Note) => void
	onRestore: (note: Note) => void
	className?: string
}

export function NoteCard({
	note,
	naming,
	ordinal,
	onAccept,
	onDismiss,
	onResolve,
	onRestore,
	className,
}: NoteCardProps) {
	const anchor = anchorLabel(note.anchor, naming)
	const settled = note.disposition === 'dismissed' || note.disposition === 'resolved'

	const meta = [
		ordinal === undefined ? null : String(ordinal).padStart(2, '0'),
		anchor.text,
		note.label,
		note.disposition === 'dismissed' ? 'dismissed' : null,
		note.disposition === 'resolved' ? 'resolved' : null,
	].filter((part): part is string => part !== null && part !== '')

	return (
		<article
			className={cx(
				'flex flex-col gap-1.5 rounded-lg border p-2.5',
				note.disposition === 'accepted'
					? 'border-accent-edge bg-accent-soft'
					: 'border-edge bg-surface',
				settled && 'opacity-55',
				className,
			)}
		>
			<p className="label-meta">
				{meta.join(' · ')}
				{anchor.orphaned ? <span className="text-accent-ink"> · orphaned</span> : null}
			</p>

			<p
				className={cx(
					'text-[0.8125rem] leading-relaxed text-ink',
					note.disposition === 'dismissed' && 'line-through',
				)}
			>
				{note.body}
			</p>

			<div className="mt-0.5 flex flex-wrap gap-1.5">
				<Actions
					note={note}
					onAccept={onAccept}
					onDismiss={onDismiss}
					onResolve={onResolve}
					onRestore={onRestore}
				/>
			</div>
		</article>
	)
}

/** Every disposition offers a way forward and a way back, so no ruling is a
 * dead end the writer has to live with. */
function Actions({
	note,
	onAccept,
	onDismiss,
	onResolve,
	onRestore,
}: Omit<NoteCardProps, 'naming' | 'ordinal' | 'className'>) {
	if (note.disposition === 'proposed') {
		return (
			<>
				<Button onClick={() => onAccept(note)} size="sm">
					accept
				</Button>
				<Button onClick={() => onDismiss(note)} size="sm" variant="quiet">
					dismiss
				</Button>
			</>
		)
	}

	if (note.disposition === 'accepted') {
		return (
			<>
				<Button onClick={() => onResolve(note)} size="sm">
					resolve
				</Button>
				<Button onClick={() => onRestore(note)} size="sm" variant="link">
					undo
				</Button>
			</>
		)
	}

	return (
		<Button onClick={() => onRestore(note)} size="sm" variant="link">
			undo
		</Button>
	)
}
