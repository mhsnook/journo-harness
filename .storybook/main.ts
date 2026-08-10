import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
	// The showcase lives here rather than in src/: screens and mocks are
	// documentation of the app, not part of it, and nothing under src/ imports
	// them.
	stories: ['./**/*.mdx', './**/*.stories.@(ts|tsx)'],
	addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
	framework: {
		name: '@storybook/react-vite',
		options: {},
	},
	typescript: {
		reactDocgen: 'react-docgen-typescript',
	},
}

export default config
