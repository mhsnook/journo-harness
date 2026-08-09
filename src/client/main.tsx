import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { queryClient } from './lib/queryClient'
import { routeTree } from './routeTree.gen'

import './styles/theme.css'

const router = createRouter({ routeTree, context: { queryClient } })

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
