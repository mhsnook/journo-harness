import { describe, expect, it } from 'vitest'

import { citation, referenceName } from '../../src/client/plan/references'
import type { ReferenceContent } from '../../src/shared/plan'

/**
 * What a Reference is headed by, against what is printed under it. A row shows
 * the two together, so neither may say what the other already said.
 */

describe('naming one piece of Reference material', () => {
	it('heads a Link with its title, and cites the rest of the record', () => {
		const link: ReferenceContent = {
			type: 'link',
			source: {
				title: 'Permit throughput in six mid-sized cities',
				author: 'R. Okonkwo',
				publication: 'the Quarterly',
				year: 2023,
			},
		}

		expect(referenceName(link)).toBe('Permit throughput in six mid-sized cities')
		expect(citation(link)).toBe('R. Okonkwo · the Quarterly · 2023')
	})

	it('heads a Quote with its passage, and cites the source', () => {
		const quote: ReferenceContent = {
			type: 'quote',
			text: 'Forty separate times.',
			source: {
				title: 'Permit throughput in six mid-sized cities',
				author: 'R. Okonkwo',
			},
		}

		expect(referenceName(quote)).toBe('“Forty separate times.”')
		expect(citation(quote)).toBe('Permit throughput in six mid-sized cities · R. Okonkwo')
	})

	// The row drops the line rather than printing the heading a second time.
	it('cites nothing where the heading is the whole record', () => {
		expect(citation({ type: 'link', source: { url: 'https://example.test/a' } })).toBe('')
		expect(citation({ type: 'quote', text: 'Forty separate times.' })).toBe('')
	})
})
