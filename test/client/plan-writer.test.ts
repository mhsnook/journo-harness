import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { addSection, setIntent, setTitle } from '../../src/client/plan/edits'
import { createPlanWriter, WRITE_DELAY } from '../../src/client/plan/writer'
import type { Plan } from '../../src/shared/plan'
import { makeNode, makePlan } from '../shared/plan-fixtures'

const start = makePlan({ outline: [makeNode({ id: 'a', title: 'A' })] })

function harness() {
	const sent: Plan[] = []
	const seen: Plan[] = []
	const writer = createPlanWriter({
		send: (plan) => sent.push(plan),
		onPlan: (plan) => seen.push(plan),
	})
	writer.receive(start)

	return { writer, sent, seen }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('typing', () => {
	it('writes once per pause rather than once per character', () => {
		const { writer, sent, seen } = harness()

		for (const typed of ['W', 'Wh', 'Why']) {
			writer.edit(setTitle(writer.plan as Plan, 'a', typed))
			vi.advanceTimersByTime(50)
		}

		// The writer sees every keystroke, and the Article Agent sees the pause.
		expect(seen.map((plan) => plan.outline[0].title)).toEqual(['A', 'W', 'Wh', 'Why'])
		expect(sent).toHaveLength(0)

		vi.advanceTimersByTime(WRITE_DELAY)
		expect(sent).toHaveLength(1)
		expect(sent[0].outline[0].title).toBe('Why')
	})

	it('starts a new pause on each keystroke', () => {
		const { writer, sent } = harness()

		writer.edit(setIntent(writer.plan as Plan, 'a', 'One'))
		vi.advanceTimersByTime(WRITE_DELAY - 1)
		writer.edit(setIntent(writer.plan as Plan, 'a', 'Two'))
		vi.advanceTimersByTime(WRITE_DELAY - 1)
		expect(sent).toHaveLength(0)

		vi.advanceTimersByTime(1)
		expect(sent).toHaveLength(1)
		expect(sent[0].outline[0].intent).toBe('Two')
	})
})

describe('everything that is not typing', () => {
	it('writes at once, and carries the pending keystrokes with it', () => {
		const { writer, sent } = harness()

		writer.edit(setTitle(writer.plan as Plan, 'a', 'Half typed'))
		writer.edit(addSection({ parentId: null, beforeId: null }, 'b'))

		expect(sent).toHaveLength(1)
		expect(sent[0].outline[0].title).toBe('Half typed')
		expect(sent[0].outline[1].id).toBe('b')

		// The pause that was pending has nothing left to send.
		vi.advanceTimersByTime(WRITE_DELAY)
		expect(sent).toHaveLength(1)
	})
})

describe('what the Article Agent sends back', () => {
	it('is taken when nothing is pending', () => {
		const { writer, seen } = harness()
		const elsewhere = makePlan({ title: 'From the Chat' })

		writer.receive(elsewhere)
		expect(writer.plan?.title).toBe('From the Chat')
		expect(seen).toHaveLength(2)
	})

	it('is ignored over an edit the writer can see', () => {
		const { writer } = harness()

		writer.edit(setTitle(writer.plan as Plan, 'a', 'Mine'))
		writer.receive(makePlan({ title: 'An older echo' }))

		expect(writer.plan?.outline[0].title).toBe('Mine')
	})
})

describe('a refusal', () => {
	it('leaves the Plan alone and sends nothing', () => {
		const { writer, sent, seen } = harness()

		const refusal = writer.edit([{ op: 'deleteNode', nodeId: 'gone' }])

		expect(refusal?.type).toBe('missing')
		expect(writer.plan).toEqual(start)
		expect(sent).toHaveLength(0)
		expect(seen).toHaveLength(1)
	})
})

describe('going away', () => {
	it('sends the last keystroke of a burst', () => {
		const { writer, sent } = harness()

		writer.edit(setTitle(writer.plan as Plan, 'a', 'Unsaved'))
		writer.dispose()

		expect(sent).toHaveLength(1)
		expect(sent[0].outline[0].title).toBe('Unsaved')

		vi.advanceTimersByTime(WRITE_DELAY)
		expect(sent).toHaveLength(1)
	})
})
