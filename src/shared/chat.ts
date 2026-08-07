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

/** The name the research tool is registered and matched under. It resolves
 * server-side and the client answers nothing, but the Chat Panel reads its
 * result to show the Offers the turn recorded. */
export const recordOffersTool = 'recordOffers'

/**
 * What `recordOffers` hands back: enough for the model to refer to what it
 * turned up, and the ids the Chat Panel looks the rows up by. The Panel renders
 * the row rather than this, because the row carries the whole Offer and this
 * carries a name.
 */
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
