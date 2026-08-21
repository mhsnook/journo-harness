import { isFrame } from '../frame'

/**
 * What the Article Agent sends back when a Plan write does not parse.
 *
 * The Agents SDK answers a refused write with a fixed `cf_agent_state_error`
 * string and logs the real reason, so the writer would otherwise be told
 * "State update rejected" and nothing about which rule failed. This frame
 * carries the reason.
 *
 * It has its own type rather than reusing `cf_agent_state_error`, because the
 * SDK sends that one too: a client would run its state-error handler twice and
 * keep the useless message. `useAgent` hands a frame it does not recognise to
 * `onMessage`, which is where this one arrives.
 */
export type PlanRefused = {
	type: 'plan_refused'
	/** Every rule the Plan broke, one per line, from `z.prettifyError`. */
	error: string
}

export const planRefusedFrame = 'plan_refused'

/** Pick the refusal out of everything else on the multiplexed socket. */
export function isPlanRefused(frame: unknown): frame is PlanRefused {
	return isFrame<PlanRefused>(frame, planRefusedFrame)
}
