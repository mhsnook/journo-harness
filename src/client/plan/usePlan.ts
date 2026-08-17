import { useCallback, useEffect, useRef, useState } from 'react'

import type { Plan, Refusal } from '../../shared/plan'
import { isPlanRefused } from '../../shared/plan'
import { parseFrame } from '../lib/frames'
import { createPlanWriter, type PlanEdit } from './writer'

/**
 * The Plan's half of one Article Agent: state blob in, edits back out through
 * `setState` — §3, rule 1. `useArticleAgent` owns the socket and passes a way to
 * reach it, so nothing here opens one.
 */

export type PlanConnection = {
	/** The Plan the writer sees, and null until the first state update arrives. */
	plan: Plan | null
	/** Takes what the builders in edits.ts return, null included, and hands back
	 * why the edit did not land — a Proposal ruling needs that in the same turn. */
	edit: (edit: PlanEdit) => Refusal | null
	/** Cleared by the next edit. */
	refusal: Refusal | null
	/** What the Article Agent said when a write did not parse. Reaching this is
	 * a bug in the applier, and it is shown rather than swallowed. */
	rejected: string | null
}

export type PlanSocket = { setState: (plan: Plan) => void }

export type PlanChannel = {
	connection: PlanConnection
	/** The two `useAgent` handlers the Plan needs. */
	onStateUpdate: (state: Plan, source: 'server' | 'client') => void
	onMessage: (event: MessageEvent) => void
}

/** `socket` is a getter, because `useAgent` has none to give on the first render
 * and swaps it on reconnect. */
export function usePlanChannel(socket: () => PlanSocket | null): PlanChannel {
	const [plan, setPlan] = useState<Plan | null>(null)
	const [refusal, setRefusal] = useState<Refusal | null>(null)
	const [rejected, setRejected] = useState<string | null>(null)

	const held = useRef<ReturnType<typeof createPlanWriter> | null>(null)
	held.current ??= createPlanWriter({
		send: (next) => socket()?.setState(next),
		onPlan: setPlan,
		onRefusal: setRefusal,
	})
	const writer = held.current

	// Flushing on the way out is what keeps the last keystroke of a burst.
	useEffect(() => () => writer.dispose(), [writer])

	const edit = useCallback(
		(next: PlanEdit) => {
			setRefusal(null)
			setRejected(null)

			return writer.edit(next)
		},
		[writer],
	)

	// A client update is the echo of a write the writer already holds.
	const onStateUpdate = (state: Plan, source: 'server' | 'client') => {
		if (source === 'server') writer.receive(state)
	}

	const onMessage = (event: MessageEvent) => {
		const frame = parseFrame(event.data)
		if (isPlanRefused(frame)) setRejected(frame.error)
	}

	return { connection: { plan, edit, refusal, rejected }, onStateUpdate, onMessage }
}
