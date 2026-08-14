import { Activity, type ReactNode } from 'react'

import { ArticleChatPanel } from '../chat/ArticleChatPanel'
import { Panel, PanelHeader, type PanelProps } from '../components/Panel'
import { PANELS, type PanelId } from '../components/PanelRail'
import { DraftPanel } from '../draft/DraftPanel'
import type { ArticleSocket } from '../lib/useArticleAgent'
import { ArticlePlanPanel } from '../plan/ArticlePlanPanel'

/**
 * The four Panels of the Article screen — architecture.md §8. Chat, Plan, and
 * Draft are live; Notes is here and empty until phase 2. This row is what gives
 * them a height to scroll their own Y within.
 */

export interface ArticlePanelsProps {
	agent: ArticleSocket
	/** Already in chat → plan → draft → notes order; `usePanels` keeps it there. */
	open: readonly PanelId[]
}

export function ArticlePanels({ agent, open }: ArticlePanelsProps) {
	return (
		<div className="flex min-h-0 flex-auto">
			{PANELS.map((panel) => {
				// `open` is in rail order, so anything past the first has a Panel on
				// its left to draw a rule against.
				const at = open.indexOf(panel)

				return (
					<Activity key={panel} mode={at === -1 ? 'hidden' : 'visible'}>
						<PanelFor agent={agent} divided={at > 0} panel={panel} />
					</Activity>
				)
			})}
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
	const edge = divided ? 'left' : 'none'

	switch (panel) {
		case 'chat':
			return <ArticleChatPanel agent={agent} divider={edge} />

		case 'plan':
			return <ArticlePlanPanel divider={edge} />

		case 'draft':
			return <DraftPanel divider={edge} />

		case 'notes':
			// Notes is always the narrow one — screen 4(e).
			return (
				<EmptyPanel divider={edge} grow={0.26} title="Notes">
					The Guide's notes arrive with phase 2, alongside the Draft they read.
				</EmptyPanel>
			)
	}
}

function EmptyPanel({
	title,
	grow,
	divider,
	children,
}: {
	title: string
	grow?: number
	divider?: PanelProps['divider']
	children: ReactNode
}) {
	return (
		<Panel divider={divider} grow={grow} variant="sunk">
			<PanelHeader title={title} />
			<p className="text-[0.75rem] leading-relaxed text-faint">{children}</p>
		</Panel>
	)
}
