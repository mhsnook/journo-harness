/**
 * Sample content for the showcase.
 *
 * None of this is wired to anything — it exists so the components can be read
 * as a real product rather than as grey boxes. Swap it for API data when the
 * back end lands; the shapes here are a reasonable first sketch of it.
 */

export interface Article {
  id: string
  title: string
  blurb: string
  phase: 'planning' | 'drafting' | 'self-edit' | 'submitted' | 'published'
  phaseLabel: string
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
    phase: 'drafting',
    phaseLabel: 'drafting',
    progress: 0.62,
    voice: 'wry',
    chips: ['3 notes'],
  },
  {
    id: 'cities',
    title: 'Why Cities Stopped Building',
    blurb: 'Permitting is not a queue. It is a series of small, reasonable refusals.',
    phase: 'planning',
    phaseLabel: 'planning chat',
    progress: 0.2,
    chips: ['12 refs'],
  },
  {
    id: 'slow-software',
    title: 'Notes on Slow Software',
    blurb: 'In praise of programs that do one thing and then stop.',
    phase: 'self-edit',
    phaseLabel: 'self-edit · round 2',
    progress: 0.95,
    chips: ['review ready'],
    needsAttention: true,
  },
]

export const olderDrafts = [
  { id: 'd1', title: 'The Quiet Part of the Grid', note: 'stalled at §2', touched: '4 mar' },
  { id: 'd2', title: 'Everyone Is a Logistics Company', note: 'plan only', touched: '19 feb' },
  { id: 'd3', title: 'A Short History of the Loading Dock', note: 'draft 1', touched: '30 jan' },
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
  { id: 'b2', title: 'Everyone Is a Logistics Company', outlet: 'the Quarterly', year: '2025' },
  { id: 'b3', title: 'A Short History of the Loading Dock', outlet: 'Municipal Review', year: '2024' },
]

/* -------------------------------------------------------------------------- */
/* The article under construction: "Why Cities Stopped Building"               */
/* -------------------------------------------------------------------------- */

export const ARTICLE_TITLE = 'Why Cities Stopped Building'

export interface OutlineSection {
  n: number
  title: string
  words: number
  adjectives?: string[]
  voice?: string
  state?: 'done' | 'current' | 'planned'
}

export const outline: OutlineSection[] = [
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

export const outlineRevised: OutlineSection[] = [
  { n: 1, title: 'The year the cranes stopped', words: 300 },
  { n: 2, title: 'How review became the process', words: 700 },
  { n: 3, title: 'Who actually pays for the delay', words: 700 },
  { n: 4, title: 'What a faster city would look like — and the argument for it', words: 700 },
]

export interface Source {
  id: string
  title: string
  author?: string
  outlet?: string
  year?: string
  favourite?: 'author' | 'publication'
  summary?: string
  quotes?: number
  state: 'undecided' | 'accepted' | 'cut'
  section?: string
  used?: boolean
}

export const sources: Source[] = [
  {
    id: 's1',
    title: 'Permit throughput in six mid-sized cities',
    author: 'R. Okonkwo',
    outlet: 'the Quarterly',
    year: '2023',
    favourite: 'publication',
    summary:
      'Median approval time tripled between 2004 and 2021 while application volume stayed flat.',
    quotes: 2,
    state: 'accepted',
    section: '§2',
    used: true,
  },
  {
    id: 's2',
    title: 'Zoning and the missing middle',
    author: 'A. Weill',
    outlet: 'Field Notes',
    year: '2019',
    favourite: 'author',
    summary: 'The four-to-twelve-unit building has effectively been legislated out of existence.',
    quotes: 1,
    state: 'accepted',
    section: '§3',
    used: false,
  },
  {
    id: 's3',
    title: 'The cost of discretionary review',
    outlet: 'Municipal Review',
    year: '2021',
    summary: 'Estimates the carrying cost of a stalled mid-rise at £4,100 a week.',
    quotes: 1,
    state: 'undecided',
  },
  {
    id: 's4',
    title: 'Housing starts, quarterly series',
    outlet: 'Office for Statistics',
    year: '2024',
    summary: 'Primary data. Useful for the opening figure, dry on its own.',
    state: 'undecided',
  },
  {
    id: 's5',
    title: 'Why nobody builds anymore (opinion)',
    outlet: 'The Evening Ledger',
    year: '2022',
    summary: 'Assertive, unsourced. Covers ground we already have better evidence for.',
    state: 'cut',
  },
]

export interface Quote {
  id: string
  text: string
  attribution: string
  section?: string
  used?: boolean
}

export const quotes: Quote[] = [
  {
    id: 'q1',
    text: 'We did not decide to stop building. We decided, forty separate times, that this particular building could wait.',
    attribution: 'Permit throughput in six mid-sized cities',
    section: '§2',
    used: true,
  },
  {
    id: 'q2',
    text: 'Every objection was reasonable. The sum of them was not.',
    attribution: 'Zoning and the missing middle',
    section: '§3',
    used: false,
  },
  {
    id: 'q3',
    text: 'The meter runs on an empty lot exactly as fast as it runs on a finished one.',
    attribution: 'The cost of discretionary review',
    used: false,
  },
]

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
