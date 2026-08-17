import type { Note } from '../../shared/note'
import { Button } from '../components/Button'
import { cx } from '../lib/cx'
import { type AnchorNaming, anchorLabel } from './anchors'
import type { NoteRulings } from './rulings'

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
	rulings: NoteRulings
	/** The queue's running number: "01". The response numbers nothing, because
	 * the tranche it sits in is the grouping there. */
	ordinal?: number
	className?: string
}

export function NoteCard({ note, naming, rulings, ordinal, className }: NoteCardProps) {
	const anchor = anchorLabel(note.anchor, naming)
	const settled = note.disposition === 'declined' || note.disposition === 'resolved'

	const meta = [
		ordinal === undefined ? null : String(ordinal).padStart(2, '0'),
		anchor.text,
		note.label,
		// Only a settled Note says which way it went: proposed is what every card
		// starts as, and accepted is already the accent wash below.
		settled ? note.disposition : null,
	].filter((part) => part !== undefined && part !== null)

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
					note.disposition === 'declined' && 'line-through',
				)}
			>
				{note.body}
			</p>

			<div className="mt-0.5 flex flex-wrap gap-1.5">
				<Actions note={note} rulings={rulings} />
			</div>
		</article>
	)
}

/** Every disposition offers a way forward and a way back, so no ruling is a
 * dead end the writer has to live with. */
function Actions({ note, rulings }: { note: Note; rulings: NoteRulings }) {
	if (note.disposition === 'proposed') {
		return (
			<>
				<Button onClick={() => rulings.accept(note)} size="sm">
					accept
				</Button>
				<Button onClick={() => rulings.decline(note)} size="sm" variant="quiet">
					decline
				</Button>
			</>
		)
	}

	if (note.disposition === 'accepted') {
		return (
			<>
				<Button onClick={() => rulings.resolve(note)} size="sm">
					resolve
				</Button>
				<Button onClick={() => rulings.restore(note)} size="sm" variant="link">
					undo
				</Button>
			</>
		)
	}

	return (
		<Button onClick={() => rulings.restore(note)} size="sm" variant="link">
			undo
		</Button>
	)
}
