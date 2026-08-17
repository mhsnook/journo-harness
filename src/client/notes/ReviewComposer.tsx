import { useState } from 'react'

import { type ReviewDepth, reviewDepths } from '../../shared/review'
import { Button, ButtonGroup } from '../components/Button'
import { TextField } from '../components/Field'
import type { Skill } from './skills'

/**
 * The one ask that starts a Review.
 *
 * Not a chat composer. Each Review is a fresh pass carrying the Draft, the
 * Plan, the References in it, this prompt, and the Notes the writer has already
 * accepted — nothing accumulates between them, which is what the line under the
 * box says.
 */

export interface ReviewComposerProps {
	skills: readonly Skill[]
	/** A Review is in flight, so a second ask would be refused. */
	running: boolean
	onRun: (prompt: string, depth: ReviewDepth) => void
	className?: string
}

/** What the writer reads on each dial setting. */
const depthLabel: Record<ReviewDepth, string> = {
	quick: 'quick',
	thorough: 'thorough',
}

export function ReviewComposer({ skills, running, onRun }: ReviewComposerProps) {
	const [prompt, setPrompt] = useState('')
	// Thorough by default. A quick pass is the one to ask for, not the one to
	// get by accident: a thin review reads as the guide having nothing to say.
	const [depth, setDepth] = useState<ReviewDepth>('thorough')

	const run = () => {
		if (running || prompt.trim() === '') return

		onRun(prompt, depth)
		setPrompt('')
	}

	return (
		<div className="flex shrink-0 flex-col gap-2 border-t border-rule bg-sunk px-3.5 py-3">
			{skills.length === 0 ? null : (
				<label className="flex items-center gap-2">
					<span className="label-meta shrink-0 text-muted">review skill</span>
					<select
						className="min-w-0 flex-1 rounded-md border border-edge bg-surface px-2 py-1 text-[0.75rem] text-ink"
						onChange={(event) => setPrompt(event.target.value)}
						value=""
					>
						<option value="">pick a saved prompt…</option>
						{skills.map((skill) => (
							<option key={skill.name} value={skill.prompt}>
								{skill.name}
							</option>
						))}
					</select>
				</label>
			)}

			<TextField
				hiddenLabel="What this Review should look for"
				onChange={setPrompt}
				onKeyDown={(event) => {
					// Ctrl+Enter sends, the same as the Chat composer. Enter alone is a
					// paragraph, because a review prompt runs long.
					if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) run()
				}}
				placeholder="Ask for a review of this draft…"
				rows={3}
				value={prompt}
			/>

			<div className="flex items-center gap-2">
				<span className="label-meta text-faint">each ask starts a new review</span>

				<ButtonGroup className="ml-auto" label="How hard the Review works">
					{reviewDepths.map((one) => (
						<Button
							key={one}
							onClick={() => setDepth(one)}
							pressed={depth === one}
							size="sm"
						>
							{depthLabel[one]}
						</Button>
					))}
				</ButtonGroup>

				<Button
					disabled={running || prompt.trim() === ''}
					onClick={run}
					size="sm"
					variant="accent"
				>
					{running ? 'reviewing…' : 'run review'}
				</Button>
			</div>
		</div>
	)
}
