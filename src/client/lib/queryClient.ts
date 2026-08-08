import { QueryClient } from '@tanstack/react-query'

/**
 * One client for the app. The article index is all it serves — live data is
 * already reactive through the Article Agent's socket, and at 1b through
 * party-db's collections (§8).
 *
 * Refetching when the window regains focus is left on, because it is what makes
 * an Article opened on the other machine turn up on this one without a reload.
 */
export const queryClient = new QueryClient({
	defaultOptions: { queries: { staleTime: 30_000 } },
})
