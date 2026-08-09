import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { queryClient } from './lib/queryClient'
import { routeTree } from './routeTree.gen'

import './styles/theme.css'

// Hovering a Link runs its route's loader: the Area routes read the index into
// the query cache, and the Article route wakes that Article's Agent.
const router = createRouter({
	routeTree,
	context: { queryClient },
	defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router
	}
}

const container = document.getElementById('root')
if (!container) throw new Error('No #root element to mount into.')

createRoot(container).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
)
