import { ArticleBar } from '../../../src/client/components/ArticleBar'
import { Button } from '../../../src/client/components/Button'
import { Check } from '../../../src/client/components/Check'
import { Chip } from '../../../src/client/components/Chip'
import { DraftSurface } from '../../../src/client/components/DraftSurface'
import { Frame, FrameBody } from '../../../src/client/components/Frame'
import { MetaLabel } from '../../../src/client/components/MetaLabel'
import { ARTICLE_TITLE, draftParagraphs } from '../../mock/content'

/**
 * 4(b) — Back in the draft with the Review's notes in the rail. The
 * notes became a checklist; the prose has gone quiet behind it because you
 * are reading, not writing, for a moment.
 */
export function ReviewRailScreen() {
	return (
		<Frame width={660}>
			<ArticleBar title={ARTICLE_TITLE} open={['draft', 'notes']} status="round 2" />
			<FrameBody row className="h-[18rem]">
				<DraftSurface paragraphs={draftParagraphs.slice(0, 3)} measure="narrow" dimmed />

				<aside className="flex w-[14rem] shrink-0 flex-col gap-3.5 border-l border-edge bg-sunk p-3.5">
					<h3 className="text-(length:--text-14) font-semibold text-ink">Full review</h3>

					<section className="flex flex-col gap-2">
						<MetaLabel count={2}>Structure</MetaLabel>
						<div className="flex items-start gap-2">
							<Check />
							<p className="text-(length:--text-12) leading-snug text-ink">
								The crane index carries §1 and §4 both
							</p>
						</div>
						<div className="flex items-start gap-2 opacity-55">
							<Check checked />
							<p className="text-(length:--text-12) leading-snug text-ink line-through">
								Human cost arrives too late
							</p>
						</div>
					</section>

					<section className="flex flex-col gap-2">
						<MetaLabel count={1}>Voice</MetaLabel>
						<div className="flex items-start gap-2">
							<Check />
							<p className="text-(length:--text-12) leading-snug text-ink">
								§3 drifts into Newsletter aside
							</p>
						</div>
					</section>

					<section className="flex flex-col gap-2">
						<MetaLabel count={3}>Citations</MetaLabel>
						<div className="flex items-start gap-2">
							<Check />
							<p className="text-(length:--text-12) leading-snug text-ink">
								£4,100 figure needs attribution
							</p>
						</div>
						<div className="flex items-start gap-2">
							<Check />
							<div className="flex min-w-0 flex-1 flex-col gap-1.5">
								<p className="text-(length:--text-12) leading-snug text-ink">
									2 of 5 planned quotes unused
								</p>
								<div className="flex flex-wrap gap-1.5">
									<Chip variant="outline" interactive>
										ledger
									</Chip>
									<Chip variant="muted" interactive>
										fine as is
									</Chip>
								</div>
							</div>
						</div>
					</section>

					<div className="mt-auto flex flex-wrap gap-2">
						<Button size="sm">send notes to chat</Button>
						<Button size="sm" variant="quiet">
							finish →
						</Button>
					</div>
				</aside>
			</FrameBody>
		</Frame>
	)
}
