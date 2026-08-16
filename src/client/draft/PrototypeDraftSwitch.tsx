import { useState } from 'react'

import type { PanelProps } from '../components/Panel'
import { PrototypeDraftPanel } from './PrototypeDraftPanel'
import { PrototypeLexicalPanel } from './PrototypeLexicalPanel'
import { PrototypeTipTapPanel } from './PrototypeTipTapPanel'

/**
 * PROTOTYPE — issue #14. Throwaway.
 *
 * Both candidate layers over the same engine, so they can be judged against the
 * same typography and the same Panel width rather than in isolation. The
 * engine question is settled; this is the one about what it is like to work in.
 */

export type Layer = 'tiptap' | 'bare' | 'lexical'

const LABELS: Record<Layer, string> = {
	tiptap: 'TipTap',
	bare: 'bare ProseMirror',
	lexical: 'Lexical',
}

export function PrototypeDraftSwitch({ divider }: { divider?: PanelProps['divider'] }) {
	const [layer, setLayer] = useState<Layer>('tiptap')

	return (
		<>
			{layer === 'tiptap' ? <PrototypeTipTapPanel divider={divider} /> : null}
			{layer === 'bare' ? <PrototypeDraftPanel divider={divider} /> : null}
			{layer === 'lexical' ? <PrototypeLexicalPanel divider={divider} /> : null}
			<LayerSwitch layer={layer} onLayer={setLayer} />
		</>
	)
}

function LayerSwitch({
	layer,
	onLayer,
}: {
	layer: Layer
	onLayer: (layer: Layer) => void
}) {
	return (
		<div className="fixed right-4 bottom-4 z-50 flex items-center gap-1 rounded-full border border-strong bg-ink p-1 shadow-lg">
			{(['tiptap', 'bare', 'lexical'] as const).map((option) => (
				<button
					className={`rounded-full px-3 py-1 text-[0.75rem] ${
						layer === option ? 'bg-surface text-ink' : 'text-green-ink'
					}`}
					key={option}
					onClick={() => onLayer(option)}
					type="button"
				>
					{LABELS[option]}
				</button>
			))}
		</div>
	)
}
