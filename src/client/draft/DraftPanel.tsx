import { type Editor, EditorContent, useEditor, useEditorState } from '@tiptap/react'

import { Notice } from '../components/Notice'
import { Panel, PanelHeader, type PanelProps } from '../components/Panel'
import { draftExtensions } from './editor'

export interface DraftPanelProps {
	divider?: PanelProps['divider']
}

/**
 * The writing surface. The writer owns everything in it — the Guide reads the
 * Draft and offers, and never writes here.
 *
 * Structure is the writer's too: they type their own headings and place their
 * own section breaks, and Section Boundaries are inferred from what they wrote
 * rather than imposed on it.
 */
export function DraftPanel({ divider }: DraftPanelProps) {
	const editor = useEditor({ extensions: draftExtensions })

	return (
		<Panel divider={divider} padded={false}>
			<div className="flex flex-col gap-2.5 p-3.5 pb-2">
				<PanelHeader title="Draft" />
				<Toolbar editor={editor} />
				<Notice>
					Nothing here is saved yet. Copy anything you want to keep before you close the
					tab.
				</Notice>
			</div>

			<div className="prose-draft min-w-0 flex-auto px-8 py-4 [&_.ProseMirror]:min-h-full [&_.ProseMirror]:outline-none [&_h2]:mt-6 [&_h2]:text-[1.05rem] [&_h2]:font-semibold [&_h3]:mt-5 [&_h3]:font-semibold [&_hr]:my-6 [&_hr]:border-t [&_hr]:border-edge">
				<EditorContent editor={editor} />
			</div>
		</Panel>
	)
}

function Toolbar({ editor }: { editor: Editor | null }) {
	// A transaction does not re-render React, so reading `isActive` in the body
	// would leave every control showing the state the caret was in when the Panel
	// last rendered. The selector re-renders only when one of these flips.
	const active = useEditorState({
		editor,
		selector: ({ editor: live }) =>
			live === null
				? null
				: {
						bold: live.isActive('bold'),
						italic: live.isActive('italic'),
						underline: live.isActive('underline'),
						heading: live.isActive('heading', { level: 2 }),
						subheading: live.isActive('heading', { level: 3 }),
					},
	})

	if (editor === null || active === null) return null

	const chain = () => editor.chain().focus()

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			<Control active={active.bold} onClick={() => chain().toggleBold().run()}>
				bold
			</Control>
			<Control active={active.italic} onClick={() => chain().toggleItalic().run()}>
				italic
			</Control>
			<Control active={active.underline} onClick={() => chain().toggleUnderline().run()}>
				underline
			</Control>
			<Control
				active={active.heading}
				onClick={() => chain().toggleHeading({ level: 2 }).run()}
			>
				heading
			</Control>
			<Control
				active={active.subheading}
				onClick={() => chain().toggleHeading({ level: 3 }).run()}
			>
				subheading
			</Control>
			<Control active={false} onClick={() => chain().setHorizontalRule().run()}>
				section break
			</Control>
		</div>
	)
}

function Control({
	active,
	onClick,
	children,
}: {
	active: boolean
	onClick: () => void
	children: string
}) {
	return (
		<button
			aria-pressed={active}
			className={`rounded-md border px-2 py-0.5 text-[0.75rem] ${
				active
					? 'border-accent-edge bg-accent-soft text-accent-ink'
					: 'border-edge text-muted'
			}`}
			onClick={onClick}
			type="button"
		>
			{children}
		</button>
	)
}
