/**
 * Every story runs in a real browser, and every story is held to the layout
 * invariants below.
 *
 * `renderToString` computed no layout, so a screen could pass every check and
 * still be visibly broken. Panels were given `overflow-y-auto` and each Frame
 * body a height to scroll within; the body then measured 1182px against the 352
 * it asked for, because `flex-1` is `flex: 1 1 0%` and a basis of 0 overrides a
 * height. Nothing scrolled. Reasoning about the class chain said it worked, and
 * only a browser said otherwise.
 *
 * The invariants run after every story, so a new screen is held to them for
 * free. Frames, Frame bodies, and Panels are found by the `data-` attributes
 * their components carry, rather than by class, so renaming a Tailwind class
 * cannot quietly empty this file.
 */

import { setProjectAnnotations } from '@storybook/react-vite'
import { beforeAll, expect } from 'vitest'

import * as previewAnnotations from './preview'
import { TARGET_SCREEN_WIDTH } from './preview'

/** Subpixel layout rounding, in px. */
const TOLERANCE = 1

/**
 * The height a screen asked its Frame body for, in px, or `null` when it asked
 * for none. Screens write it as a Tailwind arbitrary value — `h-[19rem]` — and
 * a computed style cannot give it back, because after layout `height` resolves
 * to the height the body actually got, which is the thing under test.
 */
function askedHeight(element: Element): number | null {
	const rootFontSize = Number.parseFloat(
		getComputedStyle(document.documentElement).fontSize,
	)

	for (const token of element.classList) {
		const match = /^h-\[(\d+(?:\.\d+)?)(rem|px)\]$/.exec(token)
		if (match) {
			const value = Number.parseFloat(match[1]!)
			return match[2] === 'rem' ? value * rootFontSize : value
		}
	}
	return null
}

/** Names the element a failure is about, so the message says which one. */
function describe(element: Element): string {
	return `${element.tagName.toLowerCase()}.${element.getAttribute('class') ?? ''}`
}

function checkLayout(canvasElement: HTMLElement) {
	// The width every screen is designed against — docs/ui.md. It is set as a
	// Storybook viewport, which `@storybook/addon-vitest` applies per story and
	// which overrides anything vitest.config.ts asks for. That override is silent,
	// so it is asserted rather than assumed: a story measured at some other width
	// is a story measured against the wrong `lg:` utilities.
	expect
		.soft(window.innerWidth, 'Story drawn at the wrong screen width')
		.toBe(TARGET_SCREEN_WIDTH)

	for (const frame of canvasElement.querySelectorAll('[data-frame]')) {
		// A collapsed Frame is a screen with nothing on it, which has never been
		// what a story meant to show.
		const box = frame.getBoundingClientRect()
		expect.soft(box.width, `Frame width — ${describe(frame)}`).toBeGreaterThan(0)
		expect.soft(box.height, `Frame height — ${describe(frame)}`).toBeGreaterThan(0)

		// A Frame clips its children, so a Panel that runs past the bottom edge is
		// content nobody can reach.
		for (const panel of frame.querySelectorAll('[data-panel]')) {
			expect
				.soft(
					panel.getBoundingClientRect().bottom,
					`Panel spills past its Frame — ${describe(panel)}`,
				)
				.toBeLessThanOrEqual(box.bottom + TOLERANCE)
		}
	}

	for (const body of canvasElement.querySelectorAll('[data-frame-body]')) {
		// A body that asked for a height is a body whose Panels scroll within it.
		const asked = askedHeight(body)
		if (asked !== null) {
			const measured = body.getBoundingClientRect().height
			expect
				.soft(
					Math.abs(measured - asked),
					`Frame body asked for ${asked}px and got ${measured}px — ${describe(body)}`,
				)
				.toBeLessThanOrEqual(TOLERANCE)
		}

		// Each Panel scrolls its own Y: reading down the Plan leaves the Chat
		// beside it where it was. A Panel with nothing to scroll says nothing
		// either way, so it is skipped rather than counted as a pass.
		//
		// A Panel that keeps something fixed at its foot scrolls an inner element
		// marked `data-scroller` instead of scrolling itself, so that is what gets
		// scrolled here.
		const panels = [...body.querySelectorAll<HTMLElement>(':scope > [data-panel]')]
		if (panels.length < 2) continue

		const scrollers = panels.map(
			(panel) => panel.querySelector<HTMLElement>('[data-scroller]') ?? panel,
		)

		for (const scroller of scrollers) {
			if (scroller.scrollHeight <= scroller.clientHeight + TOLERANCE) continue

			scroller.scrollTop = scroller.scrollHeight
			expect
				.soft(scroller.scrollTop, `Panel did not scroll — ${describe(scroller)}`)
				.toBeGreaterThan(0)

			for (const neighbour of scrollers) {
				if (neighbour === scroller) continue
				expect
					.soft(
						neighbour.scrollTop,
						`Scrolling a Panel moved its neighbour — ${describe(neighbour)}`,
					)
					.toBe(0)
			}

			scroller.scrollTop = 0
		}
	}
}

const project = setProjectAnnotations([
	previewAnnotations,
	{ afterEach: ({ canvasElement }) => checkLayout(canvasElement as HTMLElement) },
])

beforeAll(project.beforeAll)
