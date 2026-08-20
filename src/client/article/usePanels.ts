import { useEffect, useState } from 'react'

import { PANELS, type PanelId } from '../components/PanelRail'

/** Which Panels the Article screen shows, and the tabs a narrow one gets — §8. */

/** Below the md breakpoint the rail shows one Panel at a time. The px value is
 * `--breakpoint-md` (theme.css), and the query is the complement of `md:` —
 * what Tailwind's `max-md:` variant compiles to. */
const narrowQuery = '(width < 768px)'

export type PanelState = {
	/** Which Panels are visible. All four stay mounted. */
	open: PanelId[]
	/** The rail is a set of tabs rather than a set of toggles. */
	narrow: boolean
	toggle: (panel: PanelId) => void
}

export function usePanels(): PanelState {
	const narrow = useNarrow(narrowQuery)
	const [open, setOpen] = useState<PanelId[]>(['chat', 'plan'])

	// The first is the one furthest left, and the one the writer was reading when
	// the window shrank under them.
	useEffect(() => {
		if (narrow) setOpen((held) => (held.length > 1 ? [held[0]] : held))
	}, [narrow])

	// theme.css reads this count into the root font-size: fewer open Panels
	// leave more room, so the type and the spacing grow. A narrow window is
	// stamped 'narrow' rather than a count — it shows one Panel out of
	// necessity, not room, and must not read as the generous one-Panel scale.
	useEffect(() => {
		document.documentElement.dataset.panels = narrow ? 'narrow' : String(open.length)
		return () => {
			delete document.documentElement.dataset.panels
		}
	}, [narrow, open.length])

	return {
		open,
		narrow,
		toggle: (panel) => setOpen((held) => nextOpenPanels(held, panel, narrow)),
	}
}

/** Narrow selects; wide toggles, never down to nothing, and always back into the
 * rail's own order. */
export function nextOpenPanels(
	held: readonly PanelId[],
	panel: PanelId,
	narrow: boolean,
): PanelId[] {
	if (narrow) return [panel]

	if (held.includes(panel)) {
		return held.length === 1 ? [...held] : held.filter((one) => one !== panel)
	}

	return PANELS.filter((one) => one === panel || held.includes(one))
}

/** What the Draft's neighbours are worth against each other. The Draft is the
 * writing surface and everything else supports it, so it takes twice what a
 * supporting Panel does. */
const WEIGHTS: Record<Exclude<PanelId, 'notes'>, number> = {
	chat: 1,
	plan: 1,
	draft: 2,
}

/** Notes is the margin rail — screen 3(e) — so it takes a slice off the top
 * rather than a share of the split. It gets the wider slice when it is the one
 * Panel beside another, and the narrow one when it is a fourth column. */
const NOTES_ALONE = 0.25
const NOTES_WITH_OTHERS = 0.2

/**
 * The fraction of the Panel row one open Panel takes. Flex reads these as
 * ratios against each other, so the fractions can be handed to it directly.
 *
 * Notes is fixed first, and the Draft takes twice what a supporting Panel does
 * out of what is left. That gives 33/67 for Plan + Draft, 25/25/50 for Chat +
 * Plan + Draft, 20/20/40/20 for all four, and 75/25 for Draft + Notes.
 *
 * A hidden Panel gets 0. It is still mounted, but `Activity` has taken it out
 * of the layout, so nothing reads the number.
 */
export function panelShare(open: readonly PanelId[], panel: PanelId): number {
	if (!open.includes(panel)) return 0
	if (open.length === 1) return 1

	const notes = open.includes('notes')
		? open.length === 2
			? NOTES_ALONE
			: NOTES_WITH_OTHERS
		: 0

	if (panel === 'notes') return notes

	const rest = open.filter((one) => one !== 'notes') as Exclude<PanelId, 'notes'>[]
	const total = rest.reduce((sum, one) => sum + WEIGHTS[one], 0)

	return ((1 - notes) * WEIGHTS[panel]) / total
}

function useNarrow(query: string): boolean {
	const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches)

	useEffect(() => {
		const media = window.matchMedia(query)
		const read = () => setNarrow(media.matches)

		read()
		media.addEventListener('change', read)

		return () => media.removeEventListener('change', read)
	}, [query])

	return narrow
}
