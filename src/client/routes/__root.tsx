import { QueryClientProvider } from '@tanstack/react-query'
import { Outlet, createRootRoute } from '@tanstack/react-router'

import { queryClient } from '../lib/queryClient'

export const Route = createRootRoute({
	component: () => (
		<QueryClientProvider client={queryClient}>
			<Outlet />
		</QueryClientProvider>
	),
})
