import type { Decorator, Preview } from '@storybook/react-vite'
import {
	RouterProvider,
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
} from '@tanstack/react-router'
import { useMemo } from 'react'

import '../src/client/styles/theme.css'

/**
 * A `Link` outside a router throws, and the Articles screens are made of them.
 * The routes below are the app's paths with nothing behind them: a story is a
 * still frame, so a link renders and goes nowhere.
 */
const withRouter: Decorator = (Story) => {
	const router = useMemo(() => {
		const root = createRootRoute({ component: Story })
		const paths = ['/', '/board', '/a/$articleId'].map((path) =>
			createRoute({ getParentRoute: () => root, path, component: () => null }),
		)

		return createRouter({
			routeTree: root.addChildren(paths),
			history: createMemoryHistory({ initialEntries: ['/'] }),
		})
	}, [Story])

	return <RouterProvider router={router} />
}

const preview: Preview = {
	decorators: [withRouter],
	parameters: {
		layout: 'centered',
		controls: { expanded: true },
		backgrounds: {
			options: {
				paper: { name: 'Paper', value: '#fbecdb' },
				surface: { name: 'Surface', value: '#fbf9f5' },
			},
		},
		options: {
			storySort: {
				order: [
					'Foundations',
					['Accent', 'Colour', 'Type'],
					'Primitives',
					'Screens',
					[
						'1 Global',
						'2 Plan an article',
						'3 Drafting',
						'4 Reviews',
						'5 Finish and submit',
						'6 Archive and showcase',
					],
				],
			},
		},
	},
	initialGlobals: {
		backgrounds: { value: 'paper' },
	},
	tags: ['autodocs'],
}

export default preview
