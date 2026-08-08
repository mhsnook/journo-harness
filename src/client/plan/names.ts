import type { Plan, RefusalSubject } from '../../shared/plan'
import { outlineEntries, sectionLabel } from './outline'
import { referenceEntries, referenceMark, referenceName } from './references'

/**
 * What the writer calls one record in the Plan, for the places that name a
 * record in a sentence: a Proposal card describing an op, a refusal saying which
 * Section it could not find.
 *
 * A Section is numbered the way the Outline numbers it, out of the one walk, so
 * no two Panels can number a Section differently — §4. Nothing here reads an id
 * out loud: the writer never saw one.
 */

export type PlanNames = {
	/** "§2 Who actually pays", or "§2" where the Section is untitled. */
	section: (nodeId: string) => string
	/** The Article for a null Scope — §6. */
	scope: (nodeId: string | null) => string
	/** Its passage or its title, the way the References list has it. */
	reference: (referenceId: string) => string
	/** Whichever of the three a refusal is about. */
	subject: (subject: RefusalSubject | null) => string
	/** The same record named as briefly as it can be — "§2", "quote [3]". For a
	 * sentence that goes on to quote what the record says, where the fuller name
	 * would print the same words twice. */
	label: (subject: RefusalSubject | null) => string
}

export function planNames(plan: Plan): PlanNames {
	// Both forms out of the one walk — §4.
	const numbered = new Map(
		outlineEntries(plan.outline).map((entry) => {
			const label = sectionLabel(entry)

			return [
				entry.node.id,
				{ label, full: entry.node.title === '' ? label : `${label} ${entry.node.title}` },
			]
		}),
	)

	// A refusal is often about the record that has just gone, so "does not carry"
	// is the ordinary answer here rather than a fallback for a bug.
	const section = (nodeId: string) =>
		numbered.get(nodeId)?.full ?? 'a Section the Plan does not carry'

	const reference = (referenceId: string) => {
		const held = plan.references.find((entry) => entry.id === referenceId)

		return held === undefined
			? 'a Reference the Plan does not carry'
			: referenceName(held)
	}

	// `describeProposal` never asks for a brief name, so it never pays for this.
	let marked: Map<string, string> | null = null
	const mark = (referenceId: string) => {
		marked ??= new Map(
			referenceEntries(plan).map((entry) => [entry.reference.id, referenceMark(entry)]),
		)

		return marked.get(referenceId) ?? 'that Reference'
	}

	return {
		section,
		reference,
		scope: (nodeId) => (nodeId === null ? 'the Article' : section(nodeId)),
		subject: (subject) => {
			if (subject === null) return 'the Plan'
			if (subject.of === 'article') return 'the Article'

			return subject.of === 'section' ? section(subject.id) : reference(subject.id)
		},
		label: (subject) => {
			if (subject === null) return 'the Plan'
			if (subject.of === 'article') return 'the Article'
			if (subject.of === 'reference') return mark(subject.id)

			return numbered.get(subject.id)?.label ?? 'that Section'
		},
	}
}
