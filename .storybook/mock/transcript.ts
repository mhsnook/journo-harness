import type { UIMessage } from 'ai'

import { proposePlanChangeTool, recordOffersTool } from '../../src/shared/chat'
import { offers } from './content'

/**
 * Transcripts for the showcase, in the shape the Agents SDK stores them. The
 * tool parts carry the interesting states: a suspended Proposal has `input` and
 * no output, where a resolved `recordOffers` has both. The Proposal ops apply
 * cleanly against the mock Plan, so a story runs the real applier.
 */

/** The Chat mid-conversation, with a Proposal the writer has not ruled on. */
export const midChat: UIMessage[] = [
	{
		id: 'm-1',
		role: 'user',
		parts: [
			{
				type: 'text',
				text: "The process, then — but I want one developer in it so it isn't all spreadsheets.",
			},
		],
	},
	{
		id: 'm-2',
		role: 'assistant',
		parts: [
			{
				type: 'text',
				text: 'Then the appeal is the part that needs its own Section — the one nobody files is the whole mechanism. It runs long, so the total wants to move with it.',
			},
			{
				type: `tool-${proposePlanChangeTool}`,
				toolCallId: 'call-appeals',
				state: 'input-available',
				input: {
					ops: [
						{
							op: 'createNode',
							parentId: null,
							afterId: 'sec-cost',
							node: {
								id: 'sec-appeals',
								title: 'The appeal that nobody files',
								intent: 'Why the objector pays nothing and the clock resets anyway.',
								target: 400,
								children: [],
							},
						},
						{ op: 'setTarget', nodeId: null, expected: 2400, value: 2800 },
					],
				},
			},
		],
	},
]

/** A Proposal the Plan will refuse: its `expected` names a title the Plan no
 * longer carries. */
export const staleProposal: UIMessage[] = [
	{
		id: 's-1',
		role: 'user',
		parts: [{ type: 'text', text: 'Tighten §3 — the title is doing too much work.' }],
	},
	{
		id: 's-2',
		role: 'assistant',
		parts: [
			{ type: 'text', text: 'Shorter, and it keeps the accusation:' },
			{
				type: `tool-${proposePlanChangeTool}`,
				toolCallId: 'call-stale',
				state: 'input-available',
				input: {
					ops: [
						{
							op: 'setTitle',
							nodeId: 'sec-cost',
							expected: 'Who pays for the delay',
							value: 'Who pays',
						},
					],
				},
			},
		],
	},
]

/** A research turn that returned a lot — the mock Article's whole Offer list. */
export const researchTurn: UIMessage[] = [
	{
		id: 'r-1',
		role: 'user',
		parts: [
			{
				type: 'text',
				text: "Find me everything on approval times in comparable cities. Cast wide, I'll rule on them.",
			},
		],
	},
	{
		id: 'r-2',
		role: 'assistant',
		parts: [
			{
				type: 'text',
				text: "Seven worth showing you. Two are from your favourites, and I've ranked those first.",
			},
			{
				type: `tool-${recordOffersTool}`,
				toolCallId: 'call-research',
				state: 'output-available',
				input: { offers: [] },
				output: offers.map((offer) => ({
					id: offer.id,
					name: offer.source?.title ?? offer.text,
					disposition: offer.disposition,
					duplicate: false,
				})),
			},
			{
				type: 'text',
				text: 'Accepting one copies it into the Plan — the Offer ledger keeps the whole list either way.',
			},
		],
	},
]
