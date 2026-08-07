import { z } from 'zod'

/**
 * The Plan's schema, parsed whole on every write. The data model it enforces is
 * `docs/architecture.md` §4, who may write it is §3, and the reasoning behind
 * both is docs/adr/0002-the-plan-data-model.md.
 */

// `.min(1)` throughout, so that a field carries one spelling of "nothing here"
// rather than two — §4. A title is the exception below and carries no floor: it
// is empty from the moment a node is made until the writer types into it.
export const idSchema = z.string().min(1)
export const voiceSchema = z.string().min(1)
export const adjectiveSchema = z.string().min(1)
export const intentSchema = z.string().min(1)
export const targetSchema = z.number().int().positive()

/** Which type of Reference this is. Stored on the record rather than derived
 * from whether a text is present, so an Offer and the Reference it was copied
 * into carry one answer and the two Panels cannot label it differently. */
export const referenceTypeSchema = z.enum(['reference', 'quote'])
export type ReferenceType = z.infer<typeof referenceTypeSchema>

// strictObject throughout: the Plan has one writer, so an unknown key is a bug
// rather than a forward-compatible extension — §3, rule 1.

/** The attribution inside a Reference. */
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

/**
 * Reference material: the four fields a Reference and an Offer both carry —
 * context.md. Spread into each schema rather than shared as one schema, because
 * `.refine()` returns a type that cannot be `.extend()`ed and the two carry
 * different identity fields around it.
 */
export const referenceMaterial = {
	type: referenceTypeSchema,
	text: z.string().min(1).optional(),
	source: sourceSchema.optional(),
	note: z.string().min(1).optional(),
}

/** The invariant over the material: an entry carrying neither is nothing. Each
 * schema refines with this and states the error in its own noun, so a refused
 * Offer does not tell the writer about a Reference. */
export const carriesSomething = (material: { text?: string; source?: Source }): boolean =>
	material.text !== undefined || material.source !== undefined

/** The second invariant. The type is stored rather than read off the text, so a
 * Reference may carry a text without being a Quote but not the other way. */
export const quoteCarriesText = (material: {
	type: ReferenceType
	text?: string
}): boolean => material.type !== 'quote' || material.text !== undefined

/** Where a record came from. */
export const provenanceSchema = z
	.strictObject({
		type: z.enum(['writer', 'offer']),
		offerId: idSchema.optional(),
	})
	.refine(
		(provenance) => (provenance.type === 'offer') === (provenance.offerId !== undefined),
		{
			error: 'Provenance of type offer names an offerId, and type writer names none.',
		},
	)

/** Something the writer is drawing on. */
export const referenceSchema = z
	.strictObject({
		id: idSchema,
		...referenceMaterial,
		provenance: provenanceSchema,
		nodeId: idSchema.nullable(),
	})
	.refine(carriesSomething, {
		error: 'A Reference carries a text, a source, or both. One with neither is nothing.',
	})
	.refine(quoteCarriesText, {
		error: 'A Reference of type quote carries a text.',
	})

/** The unit of structure in the Plan. */
export const outlineNodeSchema = z.strictObject({
	id: idSchema,
	title: z.string(),
	intent: intentSchema.optional(),
	target: targetSchema.optional(),
	voice: voiceSchema.optional(),
	adjectives: z.array(adjectiveSchema).min(1).optional(),
	// zod 4 recursive schema
	get children() {
		return z.array(outlineNodeSchema)
	},
})

// The id checks below take a Plan, so the object schema is named separately —
// inferring the type from the refined schema would be circular.
const planObjectSchema = z.strictObject({
	title: z.string(),
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

/** What a new Article opens into, shaped so `validateStateChange` accepts it. */
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

/** Uniqueness and referential integrity, which the object shape cannot state. */
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
			claim(nodeIds, node.id, [...nodePath, 'id'], 'Sections')
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
				message: `Reference ${reference.id} is placed at ${reference.nodeId}, which no Section carries.`,
			})
		}
	})
}
