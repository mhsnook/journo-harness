import type { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
	component: RootRoute,
})

function RootRoute() {
	// The context's client, not the singleton the import would give: a loader and
	// the components under it have to be priming and reading one cache.
	const { queryClient } = Route.useRouteContext()

	return (
		<QueryClientProvider client={queryClient}>
			<Outlet />
		</QueryClientProvider>
	)
}
