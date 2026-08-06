import { ArticleBar } from '../../components/ArticleBar'
import { Button } from '../../components/Button'
import { ChatComposer, ChatMessage, ChatSuggestions } from '../../components/Chat'
import { Chip } from '../../components/Chip'
import { Frame, FrameBody } from '../../components/Frame'
import { MetaLabel } from '../../components/MetaLabel'
import { Pane, PaneHeader } from '../../components/Pane'
import { ARTICLE_TITLE, outlineRevised } from '../../mock/content'
import { PlanOutline } from '../article/PlanBlocks'

/**
 * 4(c) — Notes sent to chat, and the plan gets revised. This is what closes
 * the loop: draft → review → accept → chat → the plan changes → draft again.
 * Counts are restated against the new plan, so "3 of 5 quotes used" becomes
 * "3 of 4" rather than staying a failure against a plan you have abandoned.
 */
export function NotesToChatScreen() {
	return (
		<Frame width={800}>
			<ArticleBar title={ARTICLE_TITLE} open={['chat', 'plan']} status="after review 2" />
			<FrameBody row className="min-h-[21rem]">
				<Pane divider="right" className="gap-3">
					<ChatMessage from="me">
						<MetaLabel className="mb-1.5">4 accepted notes, pasted in</MetaLabel>
						<ol className="flex list-decimal flex-col gap-1 pl-4">
							<li>The crane index carries §1 and §4 both — kill the second one.</li>
							<li>The human cost lands 600 words late.</li>
							<li>§3 drifts into Newsletter aside.</li>
							<li>Two planned quotes unused, both §3.</li>
						</ol>
					</ChatMessage>

					<ChatMessage from="agent">
						Notes 1 and 2 are the same problem: §3 is doing §4's job. If §3 loses the
						throughput quote and §4 absorbs the argument, the unused quotes stop being
						unused — one gets cut for good. Want me to redo the outline that way?
					</ChatMessage>

					<ChatSuggestions>
						<Chip tone="accent" interactive>
							yes, update the plan
						</Chip>
						<Chip tone="outline" interactive>
							leave it, I'll do it
						</Chip>
					</ChatSuggestions>

					<ChatComposer />
				</Pane>

				<Pane tone="sunk" padded={false}>
					<div className="flex flex-1 flex-col gap-3.5 p-3.5">
						<PaneHeader title="Plan" meta="revised just now" />
						<PlanOutline sections={outlineRevised} dense changedFrom={3} />

						<div className="flex flex-col gap-2">
							<MetaLabel>Quotes</MetaLabel>
							<div className="flex items-center gap-2.5">
								<Chip tone="accent">3 / 4</Chip>
								<span className="text-[0.75rem] text-faint">was 3 / 5</span>
							</div>
							<div className="flex items-start gap-2.5 opacity-55">
								<span className="text-[0.6875rem] text-faint">dropped</span>
								<blockquote className="min-w-0 flex-1 border-l-2 border-rule pl-2.5 text-[0.75rem] leading-relaxed text-muted">
									“The meter runs on an empty lot exactly as fast as it runs on a finished
									one.”
									<span className="mt-0.5 block text-[0.6875rem] text-faint">
										no longer needed in §3
									</span>
								</blockquote>
							</div>
						</div>
					</div>
					<div className="flex items-center gap-3 border-t border-edge px-3.5 py-3">
						<Button>back to the draft →</Button>
						<span className="text-[0.75rem] text-faint">round 3 whenever</span>
					</div>
				</Pane>
			</FrameBody>
		</Frame>
	)
}
