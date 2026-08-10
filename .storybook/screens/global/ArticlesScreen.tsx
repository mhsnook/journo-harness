import { ArticleList } from '../../../src/client/articles/ArticleList'
import { Frame } from '../../../src/client/components/Frame'
import { articleIndex } from '../../mock/content'

/**
 * 1(a) — The Articles Area, the root screen. `ArticleList` is the live component:
 * `/` renders the same one against rows out of D1.
 */
export function ArticlesScreen() {
	return (
		<Frame width={720}>
			<ArticleList articles={articleIndex} />
		</Frame>
	)
}
