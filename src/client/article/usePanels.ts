import { useEffect, useState } from 'react'

import { PANELS, type PanelId } from '../components/PanelRail'

/**
 * Which Panels are on screen. Order is always chat → plan → draft → notes, and
 * Panels never stack — §8.
 *
 * **On a narrow screen the Panels become tabs**, so the rail selects one instead
 * of toggling several. Widening the window leaves the chosen Panel open and the
 * writer adds the others back.
 */

/** Two Panels of any use need about this much. Below it, one at a time. */
const narrowQuery = '(max-width: 56rem)'

export type PanelState = {
	open: PanelId[]
	/** True where the rail is a set of tabs rather than a set of toggles. */
	narrow: boolean
	toggle: (panel: PanelId) => void
}

export function usePanels(): PanelState {
	const narrow = useNarrow(narrowQuery)
	const [open, setOpen] = useState<PanelId[]>(['chat', 'plan'])

	// Keep the first of them, which is the one furthest left and the one the
	// writer was reading when the window shrank under them.
	useEffect(() => {
		if (narrow) setOpen((held) => (held.length > 1 ? [held[0]] : held))
	}, [narrow])

	return {
		open,
		narrow,
		toggle: (panel) => setOpen((held) => nextOpenPanels(held, panel, narrow)),
	}
}

/**
 * What the rail leaves open after the writer hits one of its pills.
 *
 * On a narrow screen it selects, so the answer is that Panel alone. On a wide
 * one it toggles, with two rules: closing the last Panel would leave the writer
 * looking at nothing, and a Panel that opens takes its own place in the order
 * rather than the end of the list.
 */
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

/** Reads the media query and follows it, so rotating a phone is not a reload. */
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
