import { useAgent } from 'agents/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { Plan, ProposalInput, Refusal } from '../../shared/plan'
import { isPlanRefused } from '../../shared/plan'
import { createPlanWriter } from './writer'

/**
 * The Plan Panel's connection to one Article Agent: its state blob in, and
 * every edit back out through `setState` — docs/architecture.md §3, rule 1.
 *
 * The socket is multiplexed, so the Chat Panel shares this one and does not
 * open its own — §8.
 */

export type PlanConnection = {
	/** The Plan the writer sees, and null until the first state update arrives. */
	plan: Plan | null
	/** Apply an edit. Takes what the builders in edits.ts return, including the
	 * null they return for an edit with nowhere to go. */
	edit: (ops: ProposalInput | null) => void
	/** Why the last edit did not land, cleared by the next one. */
	refusal: Refusal | null
	/** What the Article Agent said when a write did not parse. Reaching this is
	 * a bug in the applier, and it is shown rather than swallowed. */
	rejected: string | null
}

export function usePlan(articleId: string): PlanConnection {
	const [plan, setPlan] = useState<Plan | null>(null)
	const [refusal, setRefusal] = useState<Refusal | null>(null)
	const [rejected, setRejected] = useState<string | null>(null)

	// The socket is not built yet when the writer is, and it is replaced on every
	// reconnect, so the writer sends through a ref rather than holding one.
	const socket = useRef<{ setState: (plan: Plan) => void } | null>(null)
	const held = useRef<ReturnType<typeof createPlanWriter> | null>(null)
	held.current ??= createPlanWriter({
		send: (next) => socket.current?.setState(next),
		onPlan: setPlan,
		onRefusal: setRefusal,
	})
	const writer = held.current

	const agent = useAgent<Plan>({
		agent: 'article-agent',
		name: articleId,
		onStateUpdate: (state, source) => {
			// A client update is the echo of a write the writer already holds.
			if (source === 'server') writer.receive(state)
		},
		onMessage: (event: MessageEvent) => {
			const frame = parse(event.data)
			if (isPlanRefused(frame)) setRejected(frame.error)
		},
	})

	useEffect(() => {
		socket.current = agent
	})

	// Flushing on the way out is what keeps the last keystroke of a burst.
	useEffect(() => () => writer.dispose(), [writer])

	const edit = useCallback(
		(ops: ProposalInput | null) => {
			setRefusal(null)
			setRejected(null)
			writer.edit(ops)
		},
		[writer],
	)

	return { plan, edit, refusal, rejected }
}

/** The socket carries frames this Panel does not read, and a binary one is not
 * JSON at all. */
function parse(data: unknown): unknown {
	if (typeof data !== 'string') return null

	try {
		return JSON.parse(data)
	} catch {
		return null
	}
}
