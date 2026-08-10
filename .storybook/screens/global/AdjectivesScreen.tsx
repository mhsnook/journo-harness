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
 * 1(e) — Settings · adjectives. Fuzzier than a voice: you say a section should
 * be "high energy", and this is where you have already defined what you mean.
 */
export function AdjectivesScreen() {
	return (
		<SettingsShell
			tab="adjectives"
			selectedId="high-energy"
			addLabel="+ adjective"
			listWidth={152}
			items={[
				{ id: 'high-energy', label: 'high energy' },
				{ id: 'well-researched', label: 'well researched' },
				{ id: 'unhurried', label: 'unhurried' },
				{ id: 'concrete', label: 'concrete' },
				{ id: 'unfussy', label: 'unfussy' },
			]}
		>
			<SettingsDetailHeader title="high energy" usage="9 sections use it" />

			<RuleBlock label="What I mean by it">
				Short sentences carrying real information, one after another, with no
				throat-clearing between them. Verbs do the work. A paragraph earns the label if
				you could read it aloud without losing your place — not if it merely has
				exclamation marks.
			</RuleBlock>

			<div className="grid grid-cols-2 gap-3">
				<div className="flex flex-col gap-2">
					<PolarityHeading polarity="yes" count={3}>
						Yes
					</PolarityHeading>
					<ExampleBlock
						polarity="yes"
						text="In 2006 the number was thirty-one. Last spring it was four, and one of those was taking another crane down."
						source="Why Cities Stopped Building, §1"
					/>
					<ExampleBlock
						polarity="yes"
						text="Nobody voted for this. It happened one reasonable amendment at a time."
						source="pasted"
					/>
				</div>
				<div className="flex flex-col gap-2">
					<PolarityHeading polarity="no" count={2}>
						No
					</PolarityHeading>
					<ExampleBlock
						polarity="no"
						text="The situation is, frankly, an absolute disaster — and it's getting worse every single day!"
						reason="just loud"
					/>
					<ExampleBlock
						polarity="no"
						text="There are, it must be said, a number of factors at play here worth considering."
						reason="throat-clearing"
					/>
				</div>
			</div>

			<ScoreTest
				score="7/10"
				paragraph="What replaced the cranes was not a decision. Nobody voted to stop building…"
			/>
		</SettingsShell>
	)
}
