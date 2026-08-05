import type { Preview } from '@storybook/react-vite'
import '../src/styles/theme.css'

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
    backgrounds: {
      options: {
        paper: { name: 'Paper', value: '#f4f2ee' },
        surface: { name: 'Surface', value: '#ffffff' },
      },
    },
    options: {
      storySort: {
        order: [
          'Foundations',
          ['Accent', 'Colour', 'Type'],
          'Primitives',
          'Screens',
          [
            '1 Global',
            '2 Plan an article',
            '3 Drafting',
            '4 Reviews',
            '5 Finish and submit',
            '6 Archive and showcase',
          ],
        ],
      },
    },
  },
  initialGlobals: {
    backgrounds: { value: 'paper' },
  },
  tags: ['autodocs'],
}

export default preview
