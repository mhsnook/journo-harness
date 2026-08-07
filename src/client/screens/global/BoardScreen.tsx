import { ArticleCard } from '../../components/ArticleCard'
import { Button } from '../../components/Button'
import { EmptySlot } from '../../components/Field'
import { Frame, FrameBody } from '../../components/Frame'
import { MetaLabel } from '../../components/MetaLabel'
import { TitleBar } from '../../components/TitleBar'
import { activeArticles, publishedArticles } from '../../mock/content'

const columns = [
	{ key: 'planning', label: 'Planning' },
	{ key: 'drafting', label: 'Draft 1' },
	{ key: 'self-edit', label: 'Self-edit' },
] as const

/**
 * 1(b) — Board by status. A familiar layout for the same articles; the only
 * thing it adds over the desk is where each piece sits in the loop.
 */
export function BoardScreen() {
	return (
		<Frame width={640}>
			<TitleBar
				back="Desk"
				title="Board"
				subtitle="by status"
				actions={<Button size="sm">+ new</Button>}
			/>
			<FrameBody row className="gap-3 p-4">
				{columns.map((column) => {
					const items = activeArticles.filter((article) => article.status === column.key)
					return (
						<div key={column.key} className="flex min-w-0 flex-1 flex-col gap-2">
							<MetaLabel count={items.length}>{column.label}</MetaLabel>
							{items.map((article) => (
								<ArticleCard key={article.id} article={article} variant="column" />
							))}
							<EmptySlot className="min-h-[3rem]">drop here</EmptySlot>
						</div>
					)
				})}
				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<MetaLabel count={9}>Sent / done</MetaLabel>
					{publishedArticles.map((article) => (
						<div
							key={article.id}
							className="flex flex-col gap-1 rounded-lg border border-edge bg-sunk p-2.5"
						>
							<h3 className="text-[0.8125rem] leading-snug font-semibold text-ink">
								{article.title}
							</h3>
							<p className="text-[0.6875rem] text-faint">
								{article.outlet} · {article.date}
							</p>
						</div>
					))}
					<p className="text-[0.6875rem] text-faint">+ 21 archived</p>
				</div>
			</FrameBody>
		</Frame>
	)
}
