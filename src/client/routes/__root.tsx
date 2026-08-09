import type { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'

import { queryClient } from '../lib/queryClient'

/** The client is on the router context as well as in a provider, so a route's
 * loader can prime the cache its component then reads. */
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
	component: () => (
		<QueryClientProvider client={queryClient}>
			<Outlet />
		</QueryClientProvider>
	),
})
