import { type ReactNode, useMemo } from 'react'

import { ArticleBar } from '../../../src/client/components/ArticleBar'
import { Frame, FrameBody } from '../../../src/client/components/Frame'
import { ArticleProvider } from '../../../src/client/lib/article'
import { NotesProvider, useNotesScreen } from '../../../src/client/notes/NotesContext'
import { ReviewView } from '../../../src/client/notes/ReviewView'
import type { Note } from '../../../src/shared/note'
import type { Round } from '../../../src/shared/review'
import { ARTICLE_TITLE, plan } from '../../mock/content'
import {
	memoryDraftStore,
	memoryNoteStore,
	memoryOfferStore,
} from '../../mock/MockArticle'
import { reviewNotes, reviewRound, reviewRounds } from '../../mock/review'

/**
 * 4(a) — One Review, read whole. This is the only pass that takes the whole
 * window: the writer asked for it, so it gets their attention once.
 *
 * The prose is the review and the Notes are what survive it. Ruling here and
 * ruling in the Notes Panel are the same act, because both draw the same rows.
 */
export function FullReviewScreen() {
	return (
		<MockNotes opensOn={reviewRound.id} rounds={reviewRounds}>
			<Frame width={760}>
				<ArticleBar open={['notes']} status="round 3" title={ARTICLE_TITLE} />
				<FrameBody className="h-[32rem]" row>
					<TheReview />
				</FrameBody>
			</Frame>
		</MockNotes>
	)
}

/** The real surface, driven by the real hook over rows held in memory — the
 * same wiring `ArticleBody` does in the app. */
function TheReview() {
	const screen = useNotesScreen()
	if (screen.reading === null) return null

	return (
		<ReviewView
			naming={screen.naming}
			notes={screen.notes}
			onAccept={screen.accept}
			onBack={screen.close}
			onDecline={screen.decline}
			onOpenRound={screen.read}
			onResolve={screen.resolve}
			onRestore={screen.restore}
			onSaveSkill={(name) => screen.skills.save({ name, prompt: reviewRound.prompt })}
			round={screen.reading}
			rounds={screen.rounds}
		/>
	)
}

export interface MockNotesProps {
	children: ReactNode
	rounds?: readonly Round[]
	notes?: readonly Note[]
	/** What a Review comes back with, for a screen that runs one. */
	answer?: { parts: Round['parts']; notes: readonly Note[] }
	opensOn?: string | null
}

/**
 * The Article seam a Review reads: the Plan for its Section numbers, the Draft
 * for its paragraph numbers, and the rows themselves.
 *
 * The stores are built once per screen, because the hooks over them read once
 * per store — rebuilding on every render would reload the rows and throw away
 * every ruling the story had made.
 */
export function MockNotes({
	children,
	rounds = [],
	notes = reviewNotes,
	answer,
	opensOn = null,
}: MockNotesProps) {
	const article = useMemo(
		() => ({
			draft: memoryDraftStore({ seed: draft }),
			offers: memoryOfferStore([]),
			notes: memoryNoteStore({ rounds, notes, answer }),
			plan: { plan, edit: () => null, refusal: null, rejected: null },
		}),
		// One seam per story. The seeds are module constants, so nothing here
		// changes after the first render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	)

	return (
		<ArticleProvider value={article}>
			<NotesProvider opensOn={opensOn}>{children}</NotesProvider>
		</ArticleProvider>
	)
}

/** Enough Blocks that the anchored Notes number themselves. */
const draft = Array.from({ length: 8 }, (_, index) => ({
	id: `b${index + 1}`,
	ord: index + 1,
	json: {
		type: 'paragraph',
		content: [{ type: 'text', text: `Paragraph ${index + 1}.` }],
	},
}))
