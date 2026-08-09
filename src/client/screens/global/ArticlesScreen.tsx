import { ArticleList } from '../../articles/ArticleList'
import { Frame } from '../../components/Frame'
import { articleIndex } from '../../mock/content'

/**
 * 1(a) — The Articles Area, the root screen. `ArticleList` is the live component:
 * `/` renders the same one against rows out of D1.
 */
export function ArticlesScreen() {
	return (
		<Frame width={720}>
			{/* A handler that goes nowhere, so the rows still show their hover. */}
			<ArticleList articles={articleIndex} onOpen={() => {}} />
		</Frame>
	)
}
