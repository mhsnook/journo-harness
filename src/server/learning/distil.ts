import { generateObject, type LanguageModel } from 'ai'

import {
	distillationFloor,
	distilledRulesSchema,
	type LearnedRule,
} from '../../shared/learning'
import type { Source } from '../../shared/plan'
import { type RuledAppearance, ruledAppearances, ruledCount } from './appearances'
import { declinedRules, recordRules } from './rules'

/**
 * The distillation pass — docs/architecture.md §12.
 *
 * It reads the Offers the writer has ruled on and writes down what it sees, as
 * sentences the writer Accepts or Declines. That is the whole of it: the data
 * is a preference set, and this is the cheapest thing that turns a preference
 * set into something the guide can act on. Nothing here trains a model, and at
 * one writer's volume nothing should — a few hundred rulings will not move a
 * model's weights, and they are plenty to notice that this writer never takes a
 * source without a year on it.
 */

/** How many ruled Offers one pass reads. Newest first, so the cap drops the
 * oldest rulings rather than a random slice — a writer's taste moves, and the
 * recent half is the half worth reading. */
const readLimit = 400

/** Enough of a quote to recognise it, and no more. The pass is looking for
 * what a source is, not for what a passage says. */
const passageLimit = 180

export type Distillation =
	| { type: 'distilled'; rules: LearnedRule[]; observed: number }
	| { type: 'too_little'; ruled: number; needed: number }

/**
 * One line per ruled Offer.
 *
 * The policy that turned it up is deliberately absent. The pass is asked what
 * the writer takes, and handing it the arm labels would let it write rules
 * about the research routines instead — which is a real question, answered by
 * the policy tally rather than by a model reading tea leaves.
 */
function renderOffer(offer: RuledAppearance): string {
	const source = offer.source === null ? {} : (JSON.parse(offer.source) as Source)
	const mark = offer.disposition === 'accepted' ? '+' : '-'

	const attribution = [
		source.title,
		source.author,
		source.publication,
		source.year,
		source.url,
	]
		.filter((field) => field !== undefined && field !== null && field !== '')
		.join(' · ')

	const passage =
		offer.text === null || offer.text === ''
			? ''
			: ` "${offer.text.slice(0, passageLimit)}"`

	return `${mark} ${offer.type} | ${attribution || 'no attribution'}${passage}`
}

const instructions = [
	"You are reading one writer's decisions about research offered to them.",
	'Each line is one source they ruled on. A line starting "+" is one they took',
	'into their article; a line starting "-" is one they turned down.',
	'',
	'Write down what those decisions show about what this writer takes, as rules',
	'the researcher can follow next time. Each rule is one sentence, stated plainly,',
	'about the source rather than about the article it was for.',
	'',
	'Rules to follow yourself:',
	'- State only what these decisions carry. A rule the lines do not support is',
	'  worse than no rule, because the writer has to notice it is wrong before they',
	'  can throw it out.',
	'- One pattern needs several decisions behind it. One declined source shows',
	'  nothing; eleven declined sources with no publication date shows something.',
	'- Prefer a rule about a property you can check — a missing year, an aggregator',
	'  rather than the study, a quote longer than a paragraph — over a rule about',
	'  taste you cannot.',
	'- Return fewer rules than the limit where the decisions carry fewer. An empty',
	'  answer is correct when nothing repeats.',
	'- The basis says what you read the rule off, concretely, so the writer can',
	'  check it: how many decisions, and what they had in common.',
].join('\n')

/** Shown to the pass so it stops re-offering a reading the writer has already
 * rejected. Without it the same rulings produce the same declined rule every
 * time, and the writer declines it forever. */
function refusedBefore(rules: readonly LearnedRule[]): string {
	if (rules.length === 0) return ''

	return [
		'',
		'The writer has already read and rejected each of these. Do not offer them',
		'again, and do not offer a reworded version of one:',
		...rules.map((rule) => `- ${rule.text}`),
	].join('\n')
}

/**
 * Run one pass and record what it produced.
 *
 * It refuses below `distillationFloor` rather than answering from a handful of
 * rulings. A model given four decisions will find a pattern in them, the writer
 * has no way to tell that pattern from a real one, and an Accepted rule then
 * steers every turn — so the floor is the one guard that matters here.
 */
export async function distilRules(
	db: D1Database,
	model: LanguageModel,
): Promise<Distillation> {
	const ruled = await ruledCount(db)
	if (ruled < distillationFloor) {
		return { type: 'too_little', ruled, needed: distillationFloor }
	}

	const [offers, refused] = await Promise.all([
		ruledAppearances(db, readLimit),
		declinedRules(db),
	])

	const { object } = await generateObject({
		model,
		schema: distilledRulesSchema,
		system: instructions,
		prompt: [
			`${offers.length} decisions, newest first:`,
			'',
			offers.map(renderOffer).join('\n'),
			refusedBefore(refused),
		].join('\n'),
	})

	const rules = await recordRules(db, object, offers.length)

	return { type: 'distilled', rules, observed: offers.length }
}
