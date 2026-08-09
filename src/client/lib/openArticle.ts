import { useNavigate } from '@tanstack/react-router'

/**
 * Opens the Article the new-Article dialog just created. Every other way in is a
 * `Link` on the tile or the row; this one is a navigation because it waits on
 * the create, and because `newTitle` has to ride along to `useSeedTitle`.
 */
export function useOpenArticle(): (articleId: string, newTitle?: string) => void {
	const navigate = useNavigate()

	return (articleId, newTitle) => {
		void navigate({ to: '/a/$articleId', params: { articleId }, state: { newTitle } })
	}
}
