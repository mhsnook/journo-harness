import { useState } from 'react'

import type { OutlineNode } from '../../shared/plan'
import { Button } from '../components/Button'
import type { SectionAnchor } from './edits'

/**
 * Making a Section, and saying where it goes. The button that opens this sits
 * at the top of the Outline while a new Section usually belongs somewhere else,
 * so it asks rather than appending and leaving the writer to hunt for what it
 * did.
 *
 * Subsections are TBD, so every choice here anchors at the top level.
 */

export interface AddSectionProps {
	outline: readonly OutlineNode[]
	onAdd: (anchor: SectionAnchor) => void
}

export function AddSection({ outline, onAdd }: AddSectionProps) {
	const [asking, setAsking] = useState(false)

	const add = (anchor: SectionAnchor) => {
		setAsking(false)
		onAdd(anchor)
	}

	// With nothing in the Outline there is nowhere else to put it.
	if (outline.length === 0) {
		return (
			<Button onClick={() => add({ parentId: null, beforeId: null })} size="sm">
				+ section
			</Button>
		)
	}

	if (!asking) {
		return (
			<Button onClick={() => setAsking(true)} size="sm" variant="quiet">
				+ section
			</Button>
		)
	}

	return (
		<div
			className="flex flex-col items-stretch gap-1 rounded-md border border-edge bg-surface p-1.5"
			onKeyDown={(event) => {
				if (event.key === 'Escape') setAsking(false)
			}}
		>
			<p className="label-meta px-1 pb-0.5">Where does it go?</p>
			<Choice onChoose={() => add({ parentId: null, afterId: null })}>
				At the beginning
			</Choice>
			{/* The last Section is left out: "after" it and "at the end" are the
			    same place, and one of them is the shorter thing to read. */}
			{outline.slice(0, -1).map((node, index) => (
				<Choice key={node.id} onChoose={() => add({ parentId: null, afterId: node.id })}>
					After {index + 1}. {node.title === '' ? 'Untitled section' : node.title}
				</Choice>
			))}
			<Choice onChoose={() => add({ parentId: null, beforeId: null })}>At the end</Choice>
			<Button
				className="mt-0.5 self-end"
				onClick={() => setAsking(false)}
				size="sm"
				variant="quiet"
			>
				cancel
			</Button>
		</div>
	)
}

interface ChoiceProps {
	onChoose: () => void
	children: React.ReactNode
}

function Choice({ onChoose, children }: ChoiceProps) {
	return (
		<button
			className="truncate rounded-sm px-1 py-1 text-left text-[0.75rem] text-ink hover:bg-hush"
			onClick={onChoose}
			type="button"
		>
			{children}
		</button>
	)
}
