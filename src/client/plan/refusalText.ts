import type { Plan, Refusal, RefusalReason } from '../../shared/plan'
import { planNames, type PlanNames } from './names'

/**
 * What a refused edit reads as on screen.
 *
 * The applier writes one sentence and it is written for the model — a Declined
 * Proposal sends it back as the reason, so it names the op and the ids and may
 * run long (§6). This is the other reader: a writer, mid-task, who never saw an
 * id and does not know what `setTitle` is. The applier hands over a `reason`
 * code and the records it is about, and the table below is the only place the
 * English lives. Swap the table to swap the language.
 *
 * The table is total over `RefusalReason`, so a new refusal site in the applier
 * stops this file compiling until it says what the new one reads as.
 */

type Wording = (refusal: Refusal, name: PlanNames) => string

const wording: Record<RefusalReason, Wording> = {
	unreadable: () => 'The Chat sent a change that could not be read. Ask it to try again.',

	noPlan: () => 'The Plan has not arrived yet. Give it a moment.',

	// The four below are about a record the Plan does not carry, so there is no
	// name to give it: naming it would print the fallback and say the same thing
	// twice. What the writer needs is that it went, not which it was.
	noSection: () =>
		'That change is for a Section that is no longer in the Outline. Ask the Chat to look again.',

	noParent: () =>
		'That change puts a Section inside one that is no longer in the Outline.',

	noAnchor: (refusal, name) =>
		`That change puts a Section next to one that is no longer in ${name.subject(refusal.other)}.`,

	noReference: () =>
		'That change is for a Reference that is no longer in the list. Ask the Chat to look again.',

	// The bare label, because the sentence goes on to quote the field: the full
	// name of a Section is its number and its title, and a refused setTitle would
	// print that title twice.
	stale: (refusal, name) =>
		`${capitalise(name.label(refusal.subject))} has changed since the Chat proposed this. It now reads ${quote(refusal.found)}, where the change expected ${quote(refusal.expected)}.`,

	duplicateSectionId: (refusal, name) =>
		`That change adds ${name.subject(refusal.subject)}, which the Plan already carries.`,

	duplicateReferenceId: (refusal, name) =>
		`That change adds ${name.subject(refusal.subject)}, which the Plan already carries.`,

	moveUnderOwn: (refusal, name) =>
		`That change moves ${name.subject(refusal.subject)} inside ${name.subject(refusal.other)}, which sits inside it.`,

	mergeUnderOwn: (refusal, name) =>
		`That change merges ${name.subject(refusal.subject)} into ${name.subject(refusal.other)}, which sits inside it.`,

	mergeWithItself: (refusal, name) =>
		`That change merges ${name.subject(refusal.subject)} into itself.`,

	anchorToItself: (refusal, name) =>
		`That change moves ${name.subject(refusal.subject)} next to itself.`,

	wouldNotParse: () =>
		'That change would leave a Plan that cannot be saved, so nothing was written.',
}

/** One sentence, for the writer. */
export function refusalText(plan: Plan, refusal: Refusal): string {
	return wording[refusal.reason](refusal, planNames(plan))
}

/** What a field says, as the writer would read it back. An absent one is a
 * phrase rather than `null`, which is a word they never typed. */
function quote(value: unknown): string {
	if (value === null || value === undefined) return 'nothing'
	if (Array.isArray(value)) {
		return value.length === 0 ? 'nothing' : value.map(String).join(', ')
	}
	if (typeof value === 'string') return value === '' ? 'nothing' : `“${value}”`
	if (typeof value === 'number') return String(value)

	return JSON.stringify(value)
}

function capitalise(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1)
}
