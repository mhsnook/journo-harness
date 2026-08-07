import { ArticleCard } from '../../components/ArticleCard'
import { Button } from '../../components/Button'
import { GroupHeading } from '../../components/Divider'
import { Frame, FrameBody } from '../../components/Frame'
import { ListRow } from '../../components/ListRow'
import { TitleBar } from '../../components/TitleBar'
import { activeArticles, olderDrafts, publishedArticles } from '../../mock/content'

/**
 * 1(a) — Desk. The root screen: what you are working on now, above the fold,
 * and then the long tail. Board and table hang off this; both back-button here.
 */
export function DeskScreen() {
	return (
		<Frame width={660}>
			<TitleBar
				title="Desk"
				actions={
					<>
						<Button variant="quiet" size="sm">
							settings
						</Button>
						<Button size="sm">+ new article</Button>
					</>
				}
			/>
			<FrameBody className="gap-6 p-4">
				<div className="flex flex-col gap-3">
					<GroupHeading
						count={activeArticles.length}
						action={
							<Button variant="quiet" size="sm">
								board view
							</Button>
						}
					>
						In progress
					</GroupHeading>
					<div className="flex flex-wrap gap-3">
						{activeArticles.map((article) => (
							<ArticleCard key={article.id} article={article} />
						))}
					</div>
				</div>

				<div className="flex flex-col gap-1">
					<GroupHeading
						count={24}
						action={
							<Button variant="link" size="sm">
								see all drafts
							</Button>
						}
						className="mb-1.5"
					>
						Older drafts
					</GroupHeading>
					{olderDrafts.map((draft) => (
						<ListRow
							key={draft.id}
							title={draft.title}
							note={draft.note}
							trailing={
								<span className="text-[0.6875rem] text-faint">{draft.touched}</span>
							}
						/>
					))}
				</div>

				<div className="flex flex-col gap-1">
					<GroupHeading
						count={9}
						action={
							<span className="flex items-center gap-3">
								<Button variant="link" size="sm">
									portfolio
								</Button>
								<Button variant="link" size="sm">
									see all
								</Button>
							</span>
						}
						className="mb-1.5"
					>
						Published
					</GroupHeading>
					{publishedArticles.map((article) => (
						<ListRow
							key={article.id}
							title={article.title}
							note={article.outlet}
							trailing={
								<span className="text-[0.6875rem] text-faint">{article.date}</span>
							}
						/>
					))}
				</div>
			</FrameBody>
		</Frame>
	)
}
