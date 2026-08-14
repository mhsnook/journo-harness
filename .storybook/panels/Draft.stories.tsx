import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'

import { ArticleBar } from '../../src/client/components/ArticleBar'
import { Frame, FrameBody } from '../../src/client/components/Frame'
import { DraftPanel } from '../../src/client/draft/DraftPanel'
import { ARTICLE_TITLE } from '../mock/content'

const meta = {
	title: 'Panels/Draft',
	parameters: { layout: 'centered' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function DraftScreen() {
	return (
		<Frame width={720}>
			<ArticleBar title={ARTICLE_TITLE} open={['draft']} status="esc" divided={false} />
			<FrameBody className="h-[24rem]" row>
				<DraftPanel />
			</FrameBody>
		</Frame>
	)
}

const surface = (canvas: HTMLElement) =>
	canvas.querySelector<HTMLElement>('.ProseMirror') as HTMLElement

const blockIds = (canvas: HTMLElement) =>
	[...canvas.querySelectorAll('[data-block-id]')].map(
		(el) => (el as HTMLElement).dataset.blockId,
	)

export const Writing: Story = {
	name: 'A writer typing',
	render: () => <DraftScreen />,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await expect(canvas.getByRole('button', { name: 'bold' })).toBeVisible()

		await userEvent.click(surface(canvasElement))
		await userEvent.keyboard('The council voted on Tuesday.')
		await userEvent.keyboard('{Enter}')
		await userEvent.keyboard('Officers put the cost at £2.4m.')

		// Every Block carries its own id, which is what a note anchors to and
		// what the sync layer stores one row against.
		const ids = blockIds(canvasElement)
		await expect(ids.length).toBe(2)
		await expect(new Set(ids).size).toBe(2)
		await expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true)
	},
}

export const Structure: Story = {
	name: 'The writer places their own structure',
	render: () => <DraftScreen />,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)

		await userEvent.click(surface(canvasElement))
		await userEvent.keyboard('What the scheme costs')
		await userEvent.click(canvas.getByRole('button', { name: 'heading' }))

		await expect(canvasElement.querySelector('h2')).toHaveTextContent(
			'What the scheme costs',
		)
		await expect(canvas.getByRole('button', { name: 'heading' })).toHaveAttribute(
			'aria-pressed',
			'true',
		)

		// A section break is a Block of its own, so it takes an id like any other.
		await userEvent.click(canvas.getByRole('button', { name: 'section break' }))
		const rule = canvasElement.querySelector('hr')
		await expect(rule).toBeInTheDocument()
		await expect(rule).toHaveAttribute('data-block-id')
	},
}
