import { z } from 'zod'

/**
 * The Plan: one JSON blob in Article Agent state, parsed whole by
 * `validateStateChange` on every write. Nothing the model emits goes through
 * `planSchema` — the Chat proposes and the client applies. The piece schemas
 * below are the ones a Proposal's op payloads reuse.
 *
 * Rationale in docs/adr/0002-the-plan-data-model.md.
 */

// The field rules, stated once. A Proposal's op payloads set the same fields
// through ops.ts, so restating `.min(1)` there is drift waiting to happen.
export const idSchema = z.string().min(1)

// An absent Voice is how a Scope says "nothing here". The empty string is not a
// second way to say it. An absent intent note says the same.
export const voiceSchema = z.string().min(1)
export const adjectiveSchema = z.string().min(1)
export const intentSchema = z.string().min(1)
export const targetSchema = z.number().int().positive()

// strictObject throughout: only the client writes the Plan, so an unknown key
// is a bug rather than a forward-compatible extension.

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
		offerId: idSchema.optional(),
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
		id: idSchema,
		provenance: provenanceSchema,
		text: z.string().min(1).optional(),
		source: sourceSchema.optional(),
		nodeId: idSchema.nullable(),
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
	id: idSchema,
	title: z.string(),
	intent: intentSchema.optional(),
	target: targetSchema.optional(),
	voice: voiceSchema.optional(),
	adjectives: z.array(adjectiveSchema).optional(),
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
	totalTarget: targetSchema.nullable(),
	voice: voiceSchema.optional(),
	adjectives: z.array(adjectiveSchema),
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

type Path = (string | number)[]

/**
 * Uniqueness and referential integrity, which the object shape cannot state. A
 * Proposal that deletes a node must also unplace its References.
 */
function checkIds(plan: Plan, ctx: z.RefinementCtx) {
	const claim = (seen: Set<string>, id: string, path: Path, noun: string) => {
		if (seen.has(id)) {
			ctx.addIssue({ code: 'custom', path, message: `Two ${noun} carry the id ${id}.` })
		}
		seen.add(id)
	}

	const nodeIds = new Set<string>()

	const walk = (nodes: OutlineNode[], path: Path) => {
		nodes.forEach((node, index) => {
			const nodePath = [...path, index]
			claim(nodeIds, node.id, [...nodePath, 'id'], 'Outline nodes')
			walk(node.children, [...nodePath, 'children'])
		})
	}
	walk(plan.outline, ['outline'])

	const referenceIds = new Set<string>()
	plan.references.forEach((reference, index) => {
		claim(referenceIds, reference.id, ['references', index, 'id'], 'References')

		if (reference.nodeId !== null && !nodeIds.has(reference.nodeId)) {
			ctx.addIssue({
				code: 'custom',
				path: ['references', index, 'nodeId'],
				message: `Reference ${reference.id} is placed at ${reference.nodeId}, which no Outline node carries.`,
			})
		}
	})
}
