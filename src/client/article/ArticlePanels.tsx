import { Activity, type CSSProperties, type ReactNode } from 'react'

import { ArticleChatPanel } from '../chat/ArticleChatPanel'
import { Panel, PanelHeader, type PanelProps } from '../components/Panel'
import { PANELS, type PanelId } from '../components/PanelRail'
import { ArticleDraftPanel } from '../draft/ArticleDraftPanel'
import type { ArticleSocket } from '../lib/useArticleAgent'
import { ArticlePlanPanel } from '../plan/ArticlePlanPanel'
import { panelShare } from './usePanels'

/**
 * The four Panels of the Article screen — architecture.md §8. Chat, Plan, and
 * Draft are live; Notes is here and empty until phase 2. This row is what gives
 * them a height to scroll their own Y within.
 *
 * How wide each one gets is `panelShare`, which reads the whole open set: the
 * Draft's share depends on what is beside it.
 */

export interface ArticlePanelsProps {
	agent: ArticleSocket
	/** Already in chat → plan → draft → notes order; `usePanels` keeps it there. */
	open: readonly PanelId[]
	/** The row's type-and-spacing scale — `panelScale` in usePanels. */
	scale: number
}

export function ArticlePanels({ agent, open, scale }: ArticlePanelsProps) {
	return (
		<div
			className="panel-scale flex min-h-0 flex-auto"
			style={{ '--panel-scale': scale } as CSSProperties}
		>
			{PANELS.map((panel) => {
				// `open` is in rail order, so anything past the first has a Panel on
				// its left to draw a rule against.
				const at = open.indexOf(panel)

				return (
					<Activity key={panel} mode={at === -1 ? 'hidden' : 'visible'}>
						<PanelFor
							agent={agent}
							divided={at > 0}
							grow={panelShare(open, panel)}
							panel={panel}
						/>
					</Activity>
				)
			})}
		</div>
	)
}

function PanelFor({
	agent,
	divided,
	grow,
	panel,
}: {
	agent: ArticleSocket
	divided: boolean
	/** This Panel's share of the row — `panelShare`. */
	grow: number
	panel: PanelId
}) {
	const edge = divided ? 'left' : 'none'

	switch (panel) {
		case 'chat':
			return <ArticleChatPanel agent={agent} divider={edge} grow={grow} />

		case 'plan':
			return <ArticlePlanPanel divider={edge} grow={grow} />

		case 'draft':
			return <ArticleDraftPanel divider={edge} grow={grow} />

		case 'notes':
			return (
				<EmptyPanel divider={edge} grow={grow} title="Notes">
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
			<p className="text-12 leading-relaxed text-faint">{children}</p>
		</Panel>
	)
}
