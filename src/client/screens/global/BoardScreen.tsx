import { BoardView } from '../../articles/BoardView'
import { Frame } from '../../components/Frame'
import { articleIndex } from '../../mock/content'

/**
 * 1(b) — The Board View. The same Articles the list shows, in a column each by
 * status. Like `ArticlesScreen`, this renders the live component: `/board` draws
 * the same `BoardView` with rows out of D1.
 */
export function BoardScreen() {
	return (
		<Frame width={640}>
			<BoardView articles={articleIndex} />
		</Frame>
	)
}
