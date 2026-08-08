import { useCallback, useEffect, useRef, useState } from 'react'

import type { Plan, Refusal } from '../../shared/plan'
import { isPlanRefused } from '../../shared/plan'
import { createPlanWriter, type PlanEdit } from './writer'

/**
 * The Plan's half of one Article Agent: its state blob in, and every edit back
 * out through `setState` — docs/architecture.md §3, rule 1.
 *
 * **It does not open the socket.** The socket is multiplexed and the Chat rides
 * the same one (§8), so `useArticleAgent` opens it once above both Panels and
 * gives this channel a way to reach it. Opening a second one would mean two
 * writers, two debounce timers, and a blob whose whole design is that it has one
 * writer.
 */

export type PlanConnection = {
	/** The Plan the writer sees, and null until the first state update arrives. */
	plan: Plan | null
	/**
	 * What the builders in edits.ts return, null included, and it hands back why
	 * the edit did not land. The Plan Panel reads that off `refusal` below, and a
	 * caller ruling on a Proposal needs it in the same turn: Declining answers
	 * the tool call with the reason.
	 */
	edit: (edit: PlanEdit) => Refusal | null
	/** Why the last edit did not land, cleared by the next one. */
	refusal: Refusal | null
	/** What the Article Agent said when a write did not parse. Reaching this is
	 * a bug in the applier, and it is shown rather than swallowed. */
	rejected: string | null
}

/** All the writer needs of the socket. */
export type PlanSocket = { setState: (plan: Plan) => void }

export type PlanChannel = {
	connection: PlanConnection
	/** The two `useAgent` handlers the Plan needs. */
	onStateUpdate: (state: Plan, source: 'server' | 'client') => void
	onMessage: (event: MessageEvent) => void
}

/**
 * `socket` is read rather than held: `useAgent` has none to give on the first
 * render and replaces it on every reconnect, so the owner keeps the ref and this
 * asks it for whichever one is current.
 */
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
		const frame = parse(event.data)
		if (isPlanRefused(frame)) setRejected(frame.error)
	}

	return { connection: { plan, edit, refusal, rejected }, onStateUpdate, onMessage }
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
