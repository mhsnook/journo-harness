import { ArticleBar } from '../../../src/client/components/ArticleBar'
import { Button } from '../../../src/client/components/Button'
import { Check } from '../../../src/client/components/Check'
import { Frame, FrameBody } from '../../../src/client/components/Frame'
import { MetaLabel } from '../../../src/client/components/MetaLabel'
import { Panel, PanelHeader } from '../../../src/client/components/Panel'
import { ARTICLE_TITLE } from '../../mock/content'

interface Note {
	id: string
	text: string
	anchor: string
	accepted?: boolean
}

const structure: Note[] = [
	{
		id: 'f1',
		text: 'The crane-index image carries §1 and then carries §4 again. The second use costs you the ending.',
		anchor: '§1 ↔ §4',
	},
	{
		id: 'f2',
		text: 'The human cost arrives 600 words later than the plan puts it.',
		anchor: '§3',
		accepted: true,
	},
]

const other: Note[] = [
	{
		id: 'f3',
		text: '§3 drifts into Newsletter aside — three asides in four paragraphs, where the piece is marked Reported feature.',
		anchor: 'tone drift',
	},
	{
		id: 'f4',
		text: 'Two of five planned quotes are unused, both in §3.',
		anchor: 'citations',
	},
]

function NoteRow({ note }: { note: Note }) {
	return (
		<li className="flex items-start gap-2.5">
			<Check checked={note.accepted} label={`Accept: ${note.text}`} />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<p className="text-[0.8125rem] leading-relaxed text-ink">{note.text}</p>
				<p className="text-[0.6875rem] text-faint">
					{note.anchor}
					{note.accepted ? ' · accepted' : ''}
				</p>
			</div>
		</li>
	)
}

/**
 * 4(a) — The in-depth review, full screen. This is the only pass that takes
 * the whole window: you asked for it, so it gets your attention once. What you
 * accept then lives in the notes rail while you write.
 */
export function FullReviewScreen() {
	return (
		<Frame width={720}>
			<ArticleBar title={ARTICLE_TITLE} open={['notes']} status="round 2" />
			<FrameBody>
				<Panel className="gap-4 p-5">
					<PanelHeader title="Review of draft 2" meta="2,610 words · 6 notes" />

					<div className="flex flex-col gap-1.5">
						<MetaLabel>The shape of it</MetaLabel>
						<p className="text-[0.8125rem] leading-relaxed text-muted">
							The reporting is doing its job and the middle is the strongest it has been.
							The piece is 210 words over target and the overrun is entirely in §3, which
							is also where the plan says the argument should be tightest.
						</p>
					</div>

					<div className="grid grid-cols-2 gap-5">
						<section className="flex flex-col gap-2.5">
							<MetaLabel count={2}>Structure</MetaLabel>
							<ul className="flex flex-col gap-2.5">
								{structure.map((note) => (
									<NoteRow key={note.id} note={note} />
								))}
							</ul>
						</section>
						<section className="flex flex-col gap-2.5">
							<MetaLabel>Tone drift · 1 · Citations · 3</MetaLabel>
							<ul className="flex flex-col gap-2.5">
								{other.map((note) => (
									<NoteRow key={note.id} note={note} />
								))}
							</ul>
						</section>
					</div>

					<div className="flex items-center gap-2.5 border-t border-edge pt-3.5">
						<Button variant="accent">keep 3, back to the draft →</Button>
						<Button>send notes to chat</Button>
					</div>
				</Panel>
			</FrameBody>
		</Frame>
	)
}
