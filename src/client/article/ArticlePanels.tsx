import type { ReactNode } from 'react'

import { ArticleChatPanel } from '../chat/ArticleChatPanel'
import { Panel, PanelHeader } from '../components/Panel'
import type { PanelId } from '../components/PanelRail'
import type { ArticleSocket } from '../lib/useArticleAgent'
import { ArticlePlanPanel } from '../plan/ArticlePlanPanel'

/**
 * The four Panels of the Article screen, in the one order they ever take —
 * architecture.md §8. Chat and Plan are live; Draft and Notes are here and empty
 * until phase 2 builds them.
 *
 * Every Panel scrolls its own Y, and this row is what gives them a height to
 * scroll within, so reading down the Plan leaves the Chat beside it where it was.
 */

export interface ArticlePanelsProps {
	agent: ArticleSocket
	/** Already in chat → plan → draft → notes order; `usePanels` keeps it there. */
	open: readonly PanelId[]
}

export function ArticlePanels({ agent, open }: ArticlePanelsProps) {
	return (
		<div className="flex min-h-0 flex-auto">
			{open.map((panel, index) => (
				// A rule between neighbours, and none down the left of the first.
				<PanelFor agent={agent} divided={index > 0} key={panel} panel={panel} />
			))}
		</div>
	)
}

function PanelFor({
	agent,
	divided,
	panel,
}: {
	agent: ArticleSocket
	divided: boolean
	panel: PanelId
}) {
	// A class rather than the Panel's own `divider` prop: the two live Panels
	// forward a className and nothing else, which is all a border needs.
	const edge = divided ? 'border-l border-edge' : undefined

	switch (panel) {
		case 'chat':
			return <ArticleChatPanel agent={agent} className={edge} />

		case 'plan':
			return <ArticlePlanPanel className={edge} />

		case 'draft':
			return (
				<EmptyPanel className={edge} title="Draft">
					The writing surface arrives with phase 2. Plan the piece here and write it
					elsewhere for now.
				</EmptyPanel>
			)

		case 'notes':
			// Notes is always the narrow one — the Panel recap screen, 4(e).
			return (
				<EmptyPanel className={edge} grow={0.26} title="Notes">
					The Guide's notes arrive with phase 2, alongside the Draft they read.
				</EmptyPanel>
			)
	}
}

function EmptyPanel({
	title,
	grow,
	children,
	className,
}: {
	title: string
	grow?: number
	children: ReactNode
	className?: string
}) {
	return (
		<Panel className={className} grow={grow} variant="sunk">
			<PanelHeader title={title} />
			<p className="text-[0.75rem] leading-relaxed text-faint">{children}</p>
		</Panel>
	)
}
