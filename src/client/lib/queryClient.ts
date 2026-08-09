import { QueryClient } from '@tanstack/react-query'

/**
 * One client. The article index is all it serves (§8). Refetch-on-focus is left
 * on: it is what makes an Article opened on the other machine turn up here.
 */
export const queryClient = new QueryClient({
	defaultOptions: { queries: { staleTime: 30_000 } },
})
