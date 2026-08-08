import { createElement, type ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

/**
 * Every story renders without throwing.
 *
 * Storybook is where a component is looked at, and nothing else in CI mounts
 * one: a prop that arrives undefined typechecks, because `noUncheckedIndexedAccess`
 * is off and `offers[8]` is an `Offer` as far as the compiler is concerned. It
 * then throws on the screen, where only a person looking at Storybook finds it.
 *
 * This renders to a string rather than to a DOM, so it needs no environment and
 * no browser. Effects do not run, so what it catches is a render that throws
 * rather than a screen that behaves — which is the class of thing that got
 * through.
 */

// The titles are the file paths and the story names, which is the point: a
// failure names the story to open rather than the index it came from.
/* eslint-disable vitest/valid-title */

type Story = { render?: () => ReactElement }

const modules = import.meta.glob<Record<string, unknown>>(
	'../../src/client/**/*.stories.tsx',
	{ eager: true },
)

const files = Object.entries(modules).sort(([a], [b]) => a.localeCompare(b))

it('finds the stories', () => {
	expect(files.length).toBeGreaterThan(0)
})

for (const [path, module] of files) {
	// The default export is the meta, and every other export is a story.
	const stories = Object.entries(module).filter(([name]) => name !== 'default')

	describe(path.replace('../../', ''), () => {
		for (const [name, story] of stories) {
			it(name, () => {
				const { render } = story as Story
				// A story with no render is one this cannot check, rather than one
				// that passes.
				expect(render).toBeTypeOf('function')

				// Mounted rather than called: Storybook treats `render` as a component,
				// and a story holding `useState` throws when it is called as a function.
				renderToString(createElement(render!))
			})
		}
	})
}
