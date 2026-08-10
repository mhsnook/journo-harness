import { BoardView } from '../../../src/client/articles/BoardView'
import { Frame } from '../../../src/client/components/Frame'
import { articleIndex } from '../../mock/content'

/** 1(b) — The Board View, the live component `/board` renders. */
export function BoardScreen() {
	// Narrower than four columns on purpose, so the screen shows what a window
	// too small for the Board does.
	return (
		<Frame width={720}>
			<BoardView articles={articleIndex} />
		</Frame>
	)
}
