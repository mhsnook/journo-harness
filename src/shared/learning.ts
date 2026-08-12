import { z } from 'zod'

import { type Disposition, rulingSchema } from './offer'

/**
 * What a distillation pass read off the writer's rulings — docs/architecture.md
 * §12.
 *
 * A **Learned rule** is a sentence about what this writer takes and what they
 * turn down, distilled from Offers they have already ruled on. The writer rules
 * on it the same way they rule on an Offer, and an Accepted one joins the
 * guide's instructions on every turn.
 *
 * The artifact is a sentence rather than a weight on purpose. A wrong sentence
 * is one the writer can read and Decline, where a wrong weight is invisible,
 * and at this size the writer correcting the machine is worth more than the
 * machine being slightly better calibrated.
 */
export type LearnedRule = {
	id: string
	/** What the pass claims about the writer, in one sentence. */
	text: string
	/** What it read that off, in its own words, so the writer can check it. */
	basis: string
	/** How many ruled Offers the pass was given. A rule off eleven rulings and
	 * one off four hundred are not the same claim. */
	observed: number
	disposition: Disposition
	createdAt: number
	decidedAt: number | null
}

/**
 * What one distillation pass returns.
 *
 * Capped at six, because the pass is asked for what the rulings actually carry
 * and a model handed a quota will pad to fill it. The cap is the schema's, so
 * an over-long answer is refused and retried rather than truncated silently.
 */
export const distilledRulesSchema = z.object({
	rules: z
		.array(
			z.strictObject({
				text: z.string().trim().min(1).max(240),
				basis: z.string().trim().min(1).max(400),
			}),
		)
		.max(6),
})

export type DistilledRules = z.infer<typeof distilledRulesSchema>

/** How few ruled Offers is too few to read anything off. Below this the pass
 * refuses rather than inventing a preference from a handful of rulings — the
 * failure it is most prone to, and the one the writer is least able to catch. */
export const distillationFloor = 20

/**
 * What the writer may do to one Learned rule: rule on it, or restore a Declined
 * one. Two shapes rather than one optional field each, so a body carrying
 * neither is refused where a loose object would answer 200 and change nothing.
 */
export const ruleEditSchema = z.union([
	z.strictObject({ ruling: rulingSchema }),
	z.strictObject({ restore: z.literal(true) }),
])

export type RuleEdit = z.infer<typeof ruleEditSchema>
