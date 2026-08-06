import { z } from 'zod'

/**
 * The Plan: one JSON blob in Article Agent state. This schema serves both
 * `validateStateChange`, guarding client writes, and `generateObject`,
 * constraining what the Chat may propose. Rationale in
 * docs/adr/0002-the-plan-data-model.md.
 */

const id = z.string().min(1)

// An absent Voice is how a Scope says "nothing here". The empty string is not a
// second way to say it.
const voice = z.string().min(1)
const adjective = z.string().min(1)

// strictObject throughout: an unknown key is a bug rather than a
// forward-compatible extension, whether it comes from the client — the blob's
// only writer — or from a model emitting a field the schema does not name.

/** The attribution inside a Reference. Every field is optional on its own,
 * because a book has no url and a leaked memo has no author, and at least one
 * of them is present. */
export const sourceSchema = z
	.strictObject({
		title: z.string().min(1).optional(),
		author: z.string().min(1).optional(),
		publication: z.string().min(1).optional(),
		year: z.number().int().optional(),
		url: z.url().optional(),
	})
	.refine((source) => Object.values(source).some((field) => field !== undefined), {
		error: 'A source carries at least one of title, author, publication, year, or url.',
	})

/** Where a record came from. An Accepted Offer is copied into the Plan as a new
 * editable record that keeps a pointer to the Offer row it came from. */
export const provenanceSchema = z
	.strictObject({
		kind: z.enum(['writer', 'offer']),
		offerId: id.optional(),
	})
	.refine(
		(provenance) => (provenance.kind === 'offer') === (provenance.offerId !== undefined),
		{
			error: 'Provenance of kind offer names an offerId, and kind writer names none.',
		},
	)

/** Something the writer is drawing on. A Quote is a Reference that carries a
 * `text` — one structure, not two, and the Plan Panel's separate counts are a
 * display filter. `nodeId` is null until the Reference is placed at an Outline
 * node. */
export const referenceSchema = z
	.strictObject({
		id,
		provenance: provenanceSchema,
		text: z.string().min(1).optional(),
		source: sourceSchema.optional(),
		nodeId: id.nullable(),
		note: z.string().min(1).optional(),
	})
	.refine((reference) => reference.text !== undefined || reference.source !== undefined, {
		error: 'A Reference carries a text, a source, or both. One with neither is nothing.',
	})

/** The unit of structure in the Plan. Children are contained rather than
 * referenced, so orphans and cycles are impossible rather than merely invalid,
 * and sibling order is array position.
 *
 * `title` may be empty: the writer creates a node and then types into it. */
export const outlineNodeSchema = z.strictObject({
	id,
	title: z.string(),
	intent: z.string().min(1).optional(),
	target: z.number().int().positive().optional(),
	voice: voice.optional(),
	adjectives: z.array(adjective).optional(),
	// zod 4 recursive schema
	get children() {
		return z.array(outlineNodeSchema)
	},
})

// The id checks below take a Plan, so the object schema is named separately —
// inferring the type from the refined schema would be circular.
const planObjectSchema = z.strictObject({
	title: z.string(),
	// Null until the writer states a total. The total is stored and nothing
	// derives it — see word-count.ts for why the parts may disagree with it.
	totalTarget: z.number().int().positive().nullable(),
	voice: voice.optional(),
	adjectives: z.array(adjective),
	outline: z.array(outlineNodeSchema),
	references: z.array(referenceSchema),
})

export type Source = z.infer<typeof sourceSchema>
export type Provenance = z.infer<typeof provenanceSchema>
export type Reference = z.infer<typeof referenceSchema>
export type OutlineNode = z.infer<typeof outlineNodeSchema>
export type Plan = z.infer<typeof planObjectSchema>

export const planSchema = planObjectSchema.superRefine(checkIds)

/** What a new Article opens into. `validateStateChange` accepts it, so the
 * Article Agent can use it as `initialState`. */
export function emptyPlan(title = ''): Plan {
	return {
		title,
		totalTarget: null,
		adjectives: [],
		outline: [],
		references: [],
	}
}

/**
 * Uniqueness and referential integrity, which the object shape cannot state. A
 * Proposal that deletes a node must also unplace its References.
 */
function checkIds(plan: Plan, ctx: z.RefinementCtx) {
	const nodeIds = new Set<string>()

	const walk = (nodes: OutlineNode[], path: (string | number)[]) => {
		nodes.forEach((node, index) => {
			const nodePath = [...path, index]
			if (nodeIds.has(node.id)) {
				ctx.addIssue({
					code: 'custom',
					path: [...nodePath, 'id'],
					message: `Two Outline nodes carry the id ${node.id}.`,
				})
			}
			nodeIds.add(node.id)
			walk(node.children, [...nodePath, 'children'])
		})
	}
	walk(plan.outline, ['outline'])

	const referenceIds = new Set<string>()
	plan.references.forEach((reference, index) => {
		if (referenceIds.has(reference.id)) {
			ctx.addIssue({
				code: 'custom',
				path: ['references', index, 'id'],
				message: `Two References carry the id ${reference.id}.`,
			})
		}
		referenceIds.add(reference.id)

		if (reference.nodeId !== null && !nodeIds.has(reference.nodeId)) {
			ctx.addIssue({
				code: 'custom',
				path: ['references', index, 'nodeId'],
				message: `Reference ${reference.id} is placed at ${reference.nodeId}, which no Outline node carries.`,
			})
		}
	})
}
