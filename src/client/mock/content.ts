import type { Offer } from '../../shared/offer'
import type { Plan } from '../../shared/plan'

/**
 * Sample content for the showcase.
 *
 * The Offers and the Plan below are in the shapes the Article Agent holds, so a
 * story exercises the real Offer ledger rather than a sketch of it. Everything
 * above them is still wireframe shapes waiting on their own ticket.
 */

export interface Article {
	id: string
	title: string
	blurb: string
	status: 'planning' | 'drafting' | 'self-edit' | 'submitted' | 'published'
	statusLabel: string
	progress: number
	voice?: string
	chips?: string[]
	needsAttention?: boolean
}

export const activeArticles: Article[] = [
	{
		id: 'batteries',
		title: 'The Long Tail of Batteries',
		blurb: 'What happens to a cell after the warranty runs out, and who is counting.',
		status: 'drafting',
		statusLabel: 'drafting',
		progress: 0.62,
		voice: 'wry',
		chips: ['3 notes'],
	},
	{
		id: 'cities',
		title: 'Why Cities Stopped Building',
		blurb: 'Permitting is not a queue. It is a series of small, reasonable refusals.',
		status: 'planning',
		statusLabel: 'planning chat',
		progress: 0.2,
		chips: ['12 refs'],
	},
	{
		id: 'slow-software',
		title: 'Notes on Slow Software',
		blurb: 'In praise of programs that do one thing and then stop.',
		status: 'self-edit',
		statusLabel: 'self-edit · round 2',
		progress: 0.95,
		chips: ['review ready'],
		needsAttention: true,
	},
]

export const olderDrafts = [
	{
		id: 'd1',
		title: 'The Quiet Part of the Grid',
		note: 'stalled at §2',
		touched: '4 mar',
	},
	{
		id: 'd2',
		title: 'Everyone Is a Logistics Company',
		note: 'plan only',
		touched: '19 feb',
	},
	{
		id: 'd3',
		title: 'A Short History of the Loading Dock',
		note: 'draft 1',
		touched: '30 jan',
	},
	{ id: 'd4', title: 'Against the Roadmap', note: 'plan only', touched: '12 jan' },
]

export const publishedArticles = [
	{
		id: 'p1',
		title: 'Notes on Slow Software',
		outlet: 'the Quarterly',
		date: 'apr 2026',
		url: 'quarterly.example/slow-software',
	},
	{
		id: 'p2',
		title: 'The Long Tail of Batteries',
		outlet: 'Field Notes',
		date: 'feb 2026',
		url: 'fieldnotes.example/long-tail',
	},
]

export const portfolioBacklist = [
	{ id: 'b1', title: 'The Quiet Part of the Grid', outlet: 'Field Notes', year: '2025' },
	{
		id: 'b2',
		title: 'Everyone Is a Logistics Company',
		outlet: 'the Quarterly',
		year: '2025',
	},
	{
		id: 'b3',
		title: 'A Short History of the Loading Dock',
		outlet: 'Municipal Review',
		year: '2024',
	},
]

/* -------------------------------------------------------------------------- */
/* The article under construction: "Why Cities Stopped Building"               */
/* -------------------------------------------------------------------------- */

export const ARTICLE_TITLE = 'Why Cities Stopped Building'

export interface Section {
	n: number
	title: string
	words: number
	adjectives?: string[]
	voice?: string
	state?: 'done' | 'current' | 'planned'
}

export const outline: Section[] = [
	{
		n: 1,
		title: 'The year the cranes stopped',
		words: 300,
		adjectives: ['high energy'],
		state: 'done',
	},
	{
		n: 2,
		title: 'How review became the process',
		words: 700,
		adjectives: ['well researched'],
		voice: 'Explainer',
		state: 'done',
	},
	{ n: 3, title: 'Who actually pays for the delay', words: 900, state: 'current' },
	{
		n: 4,
		title: 'What a faster city would look like',
		words: 500,
		adjectives: ['unhurried'],
		state: 'planned',
	},
]

export const outlineRevised: Section[] = [
	{ n: 1, title: 'The year the cranes stopped', words: 300 },
	{ n: 2, title: 'How review became the process', words: 700 },
	{ n: 3, title: 'Who actually pays for the delay', words: 700 },
	{
		n: 4,
		title: 'What a faster city would look like — and the argument for it',
		words: 700,
	},
]

/* -------------------------------------------------------------------------- */
/* Its Offers and its Plan, in the shapes the Article Agent actually holds      */
/* -------------------------------------------------------------------------- */

/**
 * Eight Offers, as one research turn and one follow-up would have left them.
 * The dispositions are spread across all three so a story shows every filter
 * with something in it, and `o9` is Accepted with nothing in the Plan — the
 * stranded case the Offer ledger has to surface.
 */
export const offers: Offer[] = [
	{
		id: 'o1',
		type: 'reference',
		source: {
			title: 'Permit throughput in six mid-sized cities',
			author: 'R. Okonkwo',
			publication: 'the Quarterly',
			year: 2023,
		},
		note: 'Median approval time tripled between 2004 and 2021 while application volume stayed flat.',
		disposition: 'accepted',
		createdAt: 1,
		decidedAt: 9,
	},
	{
		id: 'o2',
		type: 'reference',
		source: {
			title: 'Zoning and the missing middle',
			author: 'A. Weill',
			publication: 'Field Notes',
			year: 2019,
		},
		note: 'The four-to-twelve-unit building has effectively been legislated out of existence.',
		disposition: 'accepted',
		createdAt: 2,
		decidedAt: 10,
	},
	{
		id: 'o3',
		type: 'reference',
		source: {
			title: 'The cost of discretionary review',
			publication: 'Municipal Review',
			year: 2021,
		},
		note: 'Estimates the carrying cost of a stalled mid-rise at £4,100 a week.',
		disposition: 'undecided',
		createdAt: 3,
		decidedAt: null,
	},
	{
		id: 'o4',
		type: 'reference',
		source: {
			title: 'Housing starts, quarterly series',
			publication: 'Office for Statistics',
			year: 2024,
		},
		note: 'Primary data. Useful for the opening figure, dry on its own.',
		disposition: 'undecided',
		createdAt: 4,
		decidedAt: null,
	},
	{
		id: 'o5',
		type: 'reference',
		source: {
			title: 'Why nobody builds anymore (opinion)',
			publication: 'The Evening Ledger',
			year: 2022,
		},
		note: 'Assertive, unsourced. Covers ground we already have better evidence for.',
		disposition: 'declined',
		createdAt: 5,
		decidedAt: 11,
	},
	{
		id: 'o6',
		type: 'quote',
		text: 'We did not decide to stop building. We decided, forty separate times, that this particular building could wait.',
		source: { title: 'Permit throughput in six mid-sized cities', author: 'R. Okonkwo' },
		disposition: 'accepted',
		createdAt: 6,
		decidedAt: 12,
	},
	{
		id: 'o7',
		type: 'quote',
		text: 'Every objection was reasonable. The sum of them was not.',
		source: { title: 'Zoning and the missing middle', author: 'A. Weill' },
		disposition: 'accepted',
		createdAt: 7,
		decidedAt: 13,
	},
	{
		id: 'o8',
		type: 'quote',
		text: 'The meter runs on an empty lot exactly as fast as it runs on a finished one.',
		source: { title: 'The cost of discretionary review' },
		disposition: 'undecided',
		createdAt: 8,
		decidedAt: null,
	},
	{
		id: 'o9',
		type: 'reference',
		source: { title: 'Interview — M. Sze, planning officer' },
		disposition: 'accepted',
		createdAt: 9,
		decidedAt: 14,
	},
]

/** The same Article's Plan. Four Sections, four References copied in from
 * Offers, and one the writer typed themselves. `o9` is Accepted and appears
 * here nowhere, which is what makes it stranded. */
export const articlePlan: Plan = {
	title: ARTICLE_TITLE,
	totalTarget: 2400,
	voice: 'Reported feature',
	adjectives: ['well researched'],
	outline: [
		{ id: 'n1', title: 'The year the cranes stopped', target: 300, children: [] },
		{
			id: 'n2',
			title: 'How review became the process',
			target: 700,
			voice: 'Explainer',
			children: [],
		},
		{ id: 'n3', title: 'Who actually pays for the delay', target: 900, children: [] },
		{
			id: 'n4',
			title: 'What a faster city would look like',
			target: 500,
			adjectives: ['unhurried'],
			children: [],
		},
	],
	references: [
		{
			id: 'r1',
			type: 'reference',
			provenance: { type: 'offer', offerId: 'o1' },
			source: offers[0].source,
			nodeId: 'n2',
		},
		{
			id: 'r2',
			type: 'reference',
			provenance: { type: 'offer', offerId: 'o2' },
			source: offers[1].source,
			nodeId: null,
		},
		{
			id: 'r3',
			type: 'quote',
			provenance: { type: 'offer', offerId: 'o6' },
			text: offers[5].text,
			source: offers[5].source,
			nodeId: 'n2',
		},
		{
			id: 'r4',
			type: 'quote',
			provenance: { type: 'offer', offerId: 'o7' },
			text: offers[6].text,
			source: offers[6].source,
			nodeId: 'n3',
		},
		{
			id: 'r5',
			type: 'reference',
			provenance: { type: 'writer' },
			source: { title: 'Review board minutes, 2019–2024' },
			note: 'Mine, from the archive. Never offered.',
			nodeId: null,
		},
	],
}

/* -------------------------------------------------------------------------- */
/* Prose                                                                       */
/* -------------------------------------------------------------------------- */

export const draftParagraphs = [
	'The crane index is a silly measure and everybody in the trade uses it anyway. You stand on a roof somewhere central, you turn slowly, and you count. In 2006 the number for this city was thirty-one. Last spring it was four, and one of those was taking another crane down.',
	'What replaced the cranes was not a decision. Nobody voted to stop building. Instead the city acquired, one reasonable amendment at a time, a review process with eleven separate points at which a single objection can reset the clock — and a culture in which resetting the clock costs the objector nothing at all.',
	'The developers I spoke to had all learned the same lesson, and none of them would say it on the record: the cheapest way to survive the process is to submit fewer, larger, blander applications and price the delay in from the start. The mid-rise infill that the plan says it wants is precisely the project that cannot absorb that cost.',
	'Which brings us to the question nobody at the hearing is asked to answer.',
]

export const draftShort = [
	'The crane index is a silly measure and everybody in the trade uses it anyway. In 2006 the number for this city was thirty-one. Last spring it was four.',
	'What replaced the cranes was not a decision. Nobody voted to stop building.',
]
