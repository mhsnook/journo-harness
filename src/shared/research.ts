import { z } from 'zod'

/**
 * What a research turn was, so the app can ask later which kind of research
 * the writer actually used — docs/architecture.md §5.
 *
 * A **batch** is one call to the research tool. An **appearance** is one Offer
 * surfaced in one batch. An Offer is the thing itself and carries the writer's
 * ruling; an appearance is one time it was put in front of them.
 */

/**
 * Which research routine produced a batch.
 *
 * **The harness names the policy, never the model.** A model asked to label its
 * own batch would be marking its own homework, and the label is what a
 * comparison between policies rests on. Today one routine serves every research
 * turn and `defaultResearchPolicy` names it. At 1b a House Skill is a policy of
 * its own, so this is an open string rather than a union — a writer authors a
 * Skill without a deploy, and a closed union would need one.
 */
export const defaultResearchPolicy = 'guide-default'

export const researchPolicySchema = z.string().trim().min(1).max(64)

/** One call to the research tool. `offered` counts appearances rather than new
 * Offers, so a turn that repeated itself still reports what the writer saw. */
export type OfferBatch = {
	id: string
	policy: string
	createdAt: number
	offered: number
}

/** One Offer surfaced in one batch. `duplicate` is what it was at that moment:
 * an Offer this Article already carried, which is a fact about the batch and
 * not about the Offer. */
export type OfferAppearance = {
	batchId: string
	offerId: string
	position: number
	duplicate: boolean
}

/**
 * What one policy has turned up and what became of it.
 *
 * `acceptRate` is over ruled Offers rather than over everything surfaced,
 * because an Undecided Offer is not a Decline — a writer who ruled on six of
 * seventeen left eleven unread, and counting those against the policy would
 * score it on how far the writer scrolled. `undecided` is reported alongside,
 * so a policy nobody finished reading is visible rather than flattering.
 *
 * `null` when nothing has been ruled on, which reads as "no evidence" where a
 * zero would read as "everything was declined".
 */
export type PolicyTally = {
	policy: string
	batches: number
	/** Appearances, duplicates included. What the writer was shown. */
	offered: number
	/** Distinct Offers, so a policy that repeats itself is not rewarded. */
	distinct: number
	/** Appearances of an Offer the Article already carried. */
	duplicates: number
	accepted: number
	declined: number
	undecided: number
	acceptRate: number | null
}
