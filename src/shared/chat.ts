import { z } from 'zod'

import { dispositions } from './offer'
import { chatProposalSchema, planSchema } from './plan'

/**
 * What the two ends of a Chat turn agree on. The Article Agent declares the
 * Proposal tool and reads the request body; the Chat Panel matches the
 * suspended tool call by name and reads its input. Neither side may state
 * these on its own, so they live where both can import them — the client
 * tsconfig carries `src/shared` and nothing else of the server's.
 *
 * The model-facing half — what the tool's description tells the model — stays
 * in `src/server/llm/tools.ts`, because no client reads it.
 */

/** The name the Proposal tool is registered and matched under. */
export const proposePlanChangeTool = 'proposePlanChange'

/**
 * What the model fills in to make a Proposal, and what the client reads off
 * the suspended call. Strict, like the op payloads inside it: a model that
 * adds a field fails the whole call and retries with the validation error
 * rather than having the field silently stripped — `docs/architecture.md` §6.
 *
 * `chatProposalSchema` rather than `proposalSchema`: the applier understands
 * three more ops, and they are the writer's own References. Research reaches
 * the Plan through the Ledger (§5), so the model is never offered a way round
 * it.
 */
export const proposePlanChangeInput = z.strictObject({ ops: chatProposalSchema })
export type ProposePlanChangeInput = z.infer<typeof proposePlanChangeInput>

/** The name the research tool is registered and matched under. The client
 * answers nothing, but reads the result to show what the turn recorded. */
export const recordOffersTool = 'recordOffers'

/** The name the search tool is registered and matched under. The client
 * answers nothing here either, and reads the call so the transcript says the
 * guide is looking something up rather than sitting silent. */
export const webSearchTool = 'webSearch'

/**
 * What the model fills in to search. Strict like the Proposal's input, so a
 * model that invents a field is refused and retried with the error rather than
 * having the field stripped — §6.
 *
 * Three fields and no more. `category` and the domain filters are reachable in
 * Exa and are left out until something asks for them: every field here is one
 * the model has to be taught, and one it can get wrong.
 */
export const webSearchInput = z.strictObject({
	query: z.string().min(1),
	/** Capped at the provider's bundled ten. Each result carries an excerpt, and
	 * the excerpts are what a turn spends its context on. */
	count: z.number().int().min(1).max(10).optional(),
	/** Published on or after this date, as YYYY-MM-DD. The reason this tool
	 * exists: the writer's deadline is not the model's training cutoff. */
	since: z.iso.date().optional(),
})
export type WebSearchInput = z.infer<typeof webSearchInput>

/** One result, in the shape an Offer is written from: a `source` needs the
 * url, the title, the author, and a year, and a Quote needs a passage that
 * came off the page. */
export const webSearchResult = z.object({
	url: z.url(),
	title: z.string().optional(),
	author: z.string().optional(),
	/** YYYY-MM-DD, as the provider estimated it from the page. */
	published: z.string().optional(),
	/** The passage the provider pulled for this query. A Quote's text is copied
	 * out of here, and this is the whole point of retrieving rather than
	 * recalling. */
	excerpt: z.string().optional(),
})
export type WebSearchResult = z.infer<typeof webSearchResult>

/**
 * What a search hands back. Two branches, because a turn still owes the writer
 * an answer when search breaks: `ok` with no results means the web had nothing,
 * and `unavailable` means the search did not happen. The tool never throws, so
 * neither ends the turn — see `src/server/llm/search.ts`.
 */
export const webSearchOutput = z.discriminatedUnion('status', [
	z.object({ status: z.literal('ok'), results: z.array(webSearchResult) }),
	z.object({ status: z.literal('unavailable'), reason: z.string() }),
])
export type WebSearchOutput = z.infer<typeof webSearchOutput>

/** What `recordOffers` hands back: enough for the model to refer to what it
 * turned up, and the ids the Chat Panel looks the rows up by. */
export const recordedOffersOutput = z.array(
	z.object({
		id: z.string(),
		name: z.string().optional(),
		disposition: z.enum(dispositions),
		duplicate: z.boolean(),
	}),
)
export type RecordedOffers = z.infer<typeof recordedOffersOutput>

/**
 * What the client sends alongside the messages. The Plan rides here because
 * `body` is request-only, where `metadata` persists on the `UIMessage` and
 * re-rides every turn (§6).
 *
 * Not strict: the Agents SDK hands the turn every body key it did not consume
 * itself, and this schema speaks for one of them.
 */
export const chatRequestBody = z.object({ plan: planSchema.optional() })
