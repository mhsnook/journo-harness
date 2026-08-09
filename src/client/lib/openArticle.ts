import { useNavigate } from '@tanstack/react-router'

/**
 * Where every "open this Article" control goes. `newTitle` is the name the
 * new-Article dialog collected, which `useSeedTitle` writes into the Plan on the
 * far side.
 */
export function useOpenArticle(): (articleId: string, newTitle?: string) => void {
	const navigate = useNavigate()

	return (articleId, newTitle) => {
		void navigate({ to: '/a/$articleId', params: { articleId }, state: { newTitle } })
	}
}
