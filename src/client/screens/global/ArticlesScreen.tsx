import { ArticleList } from '../../articles/ArticleList'
import { Frame } from '../../components/Frame'
import { articleIndex } from '../../mock/content'

/**
 * 1(a) — The Articles Area. The root screen: what you are working on now, and
 * the Archived pieces underneath. The Board View and the table both back-button
 * here.
 *
 * The component below is the live one — `/` renders the same `ArticleList` with
 * rows out of D1 — so this screen is the wireframe and the product at once.
 */
export function ArticlesScreen() {
	return (
		<Frame width={660}>
			<ArticleList articles={articleIndex} />
		</Frame>
	)
}
