import { useMemo, useState } from 'react'

import type { Note } from '../../shared/note'
import type { Round, RoundPart } from '../../shared/review'
import { Button } from '../components/Button'
import { TextField } from '../components/Field'
import { MetaLabel } from '../components/MetaLabel'
import { Notice } from '../components/Notice'
import { Panel } from '../components/Panel'
import { dateAndTime } from '../lib/when'
import type { AnchorNaming } from './anchors'
import { NoteCard } from './NoteCard'
import type { NoteRulings } from './rulings'

/**
 * One Review, read whole — mock 8(b). It takes the window rather than sitting
 * in the Panel row, because the writer asked for it and this is the one thing
 * that gets their attention once.
 *
 * **The prose is the review and the Notes are what survive it.** Each part is a
 * passage of the Guide's reasoning and then the Notes that passage produced, so
 * a Note can stay short: the writer has just read the argument above it and
 * will remember what it refers to. Accepting here and accepting in the Notes
 * Panel are one act, because both draw the same rows.
 */

export interface ReviewViewProps {
	round: Round
	/** Every Note on the Article. The parts name theirs by id. */
	notes: readonly Note[]
	/** For the history picker. */
	rounds: readonly Round[]
	naming: AnchorNaming
	rulings: NoteRulings
	onOpenRound: (round: Round) => void
	onBack: () => void
	onSaveSkill: (name: string) => void
	className?: string
}

export function ReviewView({
	round,
	notes,
	rounds,
	naming,
	rulings,
	onOpenRound,
	onBack,
	onSaveSkill,
	className,
}: ReviewViewProps) {
	const byId = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes])

	return (
		<Panel className={className} padded={false}>
			<div className="mx-auto flex w-full max-w-[46rem] flex-col gap-4 px-6 py-5">
				<div className="flex items-baseline gap-2.5">
					<h2 className="text-[0.875rem] font-semibold text-ink">
						Review · Round {round.ordinal}
					</h2>
					<span className="label-meta">{dateAndTime(round.startedAt)}</span>

					<div className="ml-auto flex items-center gap-2">
						{rounds.length < 2 ? null : (
							<select
								aria-label="Earlier Rounds"
								className="rounded-full border border-edge bg-surface px-2.5 py-1 text-[0.75rem] text-ink"
								onChange={(event) => {
									const picked = rounds.find((one) => one.id === event.target.value)
									if (picked !== undefined) onOpenRound(picked)
								}}
								value={round.id}
							>
								{[...rounds].reverse().map((one) => (
									<option key={one.id} value={one.id}>
										Round {one.ordinal} · {dateAndTime(one.startedAt)}
									</option>
								))}
							</select>
						)}
						<Button onClick={onBack} size="sm">
							back to draft
						</Button>
					</div>
				</div>

				<TheAsk onSave={onSaveSkill} round={round} />

				{round.state === 'running' ? (
					<p className="text-[0.8125rem] leading-relaxed text-faint">
						Reading the Draft. This carries on if you leave — the findings will be here
						when you come back.
					</p>
				) : null}

				{round.state === 'failed' ? (
					<Notice>
						This Review did not finish. {round.failure ?? 'No reason was recorded.'}
					</Notice>
				) : null}

				{round.parts.map((part, index) => (
					<Part byId={byId} key={index} naming={naming} part={part} rulings={rulings} />
				))}

				{round.state === 'done' ? (
					<p className="label-meta border-t border-edge pt-3">
						bound by the Plan and the References in it — a Review proposes no new sources
					</p>
				) : null}
			</div>
		</Panel>
	)
}

/** What the writer asked for, echoed so the response reads as an answer, and
 * the one control that keeps the prompt for next time. */
function TheAsk({ round, onSave }: { round: Round; onSave: (name: string) => void }) {
	// Null is "not naming it", and a string is the name being typed. The one
	// place that tells them apart is `naming` below.
	const [name, setName] = useState<string | null>(null)
	const naming = name !== null

	const save = () => {
		const named = name?.trim() ?? ''
		if (named === '') return

		onSave(named)
		setName(null)
	}

	return (
		<div className="flex flex-col gap-2 rounded-lg border border-edge bg-sunk p-3">
			<MetaLabel>you asked · {round.depth}</MetaLabel>
			<p className="text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-ink">
				{round.prompt}
			</p>

			{naming ? (
				<div className="flex items-center gap-2">
					<TextField
						className="flex-1"
						hiddenLabel="What to call this Skill"
						onChange={setName}
						onKeyDown={(event) => {
							if (event.key === 'Enter') save()
						}}
						placeholder="name it — repetition, verify sources…"
						size="sm"
						value={name ?? ''}
					/>
					<Button disabled={name?.trim() === ''} onClick={save} size="sm">
						save
					</Button>
					<Button onClick={() => setName(null)} size="sm" variant="quiet">
						cancel
					</Button>
				</div>
			) : (
				<Button className="self-start" onClick={() => setName('')} size="sm">
					save as review skill
				</Button>
			)}
		</div>
	)
}

/** One passage of reasoning, and the Notes it produced. A part with no Notes is
 * ordinary — not every paragraph of a review lands on a specific line. */
function Part({
	part,
	byId,
	naming,
	rulings,
}: {
	part: RoundPart
	byId: ReadonlyMap<string, Note>
	naming: AnchorNaming
	rulings: NoteRulings
}) {
	// A row the response names and the store does not have is dropped rather than
	// drawn empty. It means a read raced a write, and the next read fixes it.
	const notes = part.noteIds
		.map((id) => byId.get(id))
		.filter((one): one is Note => one !== undefined)

	const proposed = notes.filter((note) => note.disposition === 'proposed')

	return (
		<section className="flex flex-col gap-2.5">
			{part.prose.split('\n\n').map((paragraph, index) => (
				<p className="text-[0.8125rem] leading-relaxed text-ink" key={index}>
					{paragraph}
				</p>
			))}

			{notes.length === 0 ? null : (
				<div className="flex flex-col gap-2 border-l-2 border-accent-edge pl-3">
					<div className="flex items-baseline gap-2.5">
						<MetaLabel count={notes.length}>{part.label ?? 'notes'}</MetaLabel>

						{proposed.length === 0 ? null : (
							<div className="ml-auto flex items-center gap-1.5">
								<Button
									onClick={() => proposed.forEach(rulings.accept)}
									size="sm"
									variant="link"
								>
									accept all
								</Button>
								<Button
									onClick={() => proposed.forEach(rulings.decline)}
									size="sm"
									variant="link"
								>
									decline all
								</Button>
							</div>
						)}
					</div>

					{notes.map((note) => (
						<NoteCard key={note.id} naming={naming} note={note} rulings={rulings} />
					))}
				</div>
			)}
		</section>
	)
}
