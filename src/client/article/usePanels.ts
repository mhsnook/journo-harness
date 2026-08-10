import { useEffect, useState } from 'react'

import { PANELS, type PanelId } from '../components/PanelRail'

/** Which Panels the Article screen shows, and the tabs a narrow one gets — §8. */

/** Two Panels of any use need about this much. Below it, one at a time. */
const narrowQuery = '(max-width: 56rem)'

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
