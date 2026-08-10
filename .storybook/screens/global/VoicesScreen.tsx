import {
	ExampleBlock,
	PolarityHeading,
} from '../../../src/client/components/ExampleBlock'
import {
	RuleBlock,
	ScoreTest,
	SettingsDetailHeader,
	SettingsShell,
} from './SettingsShell'

/**
 * 1(d) — Settings · voices. A Voice is a tiny prompt that tells the Guide how
 * to assess a piece of writing. An article has a dominant one; sections can
 * override it.
 */
export function VoicesScreen() {
	return (
		<SettingsShell
			tab="voices"
			selectedId="reported"
			addLabel="+ voice"
			items={[
				{ id: 'house', label: 'House plain' },
				{ id: 'reported', label: 'Reported feature' },
				{ id: 'newsletter', label: 'Newsletter aside' },
				{ id: 'explainer', label: 'Explainer' },
				{ id: 'obit', label: 'Short obituary' },
			]}
		>
			<SettingsDetailHeader title="Reported feature" usage="4 articles · 2 sections" />

			<RuleBlock label="Prompt — how the Guide assesses this Voice">
				Reported, not argued. Every claim is attributed in the sentence that makes it.
				Scene before analysis. Sentences average under twenty-five words; no more than one
				subordinate clause deep. First person is allowed but rationed — roughly once a
				section, and only where the reporter was actually in the room.
			</RuleBlock>

			<div className="grid grid-cols-2 gap-3">
				<div className="flex flex-col gap-2">
					<PolarityHeading polarity="yes" count={3}>
						Sounds like this
					</PolarityHeading>
					<ExampleBlock
						polarity="yes"
						text="The crane index is a silly measure and everybody in the trade uses it anyway."
						source="The Long Tail of Batteries"
					/>
					<ExampleBlock
						polarity="yes"
						text="Okonkwo showed me the spreadsheet on his phone, in the car park, because the office had already closed."
						source="pasted"
					/>
				</div>
				<div className="flex flex-col gap-2">
					<PolarityHeading polarity="no" count={2}>
						Not this
					</PolarityHeading>
					<ExampleBlock
						polarity="no"
						text="So here's the thing about permits — and honestly, you're going to love this."
						reason="too breezy, reads like the newsletter"
					/>
					<ExampleBlock
						polarity="no"
						text="It is arguably the case that discretionary review has, on balance, proven suboptimal."
						reason="argued, not reported"
					/>
				</div>
			</div>

			<ScoreTest
				score="8/10"
				paragraph="The developers I spoke to had all learned the same lesson, and none of them would say it on the record…"
			/>
		</SettingsShell>
	)
}
