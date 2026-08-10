import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ReferenceCard } from '../../src/client/components/ReferenceCard'
import type { Disposition, Offer } from '../../src/shared/offer'

/**
 * What a card offers against what the writer has already ruled. A Chat card
 * that offers Decline on an Accepted Offer would leave its copy in the Plan
 * under a Declined row, which nothing then reconciles.
 */

function card(disposition: Disposition, variant: 'offer' | 'ledger' = 'offer') {
	const offer: Offer = {
		id: 'o1',
		type: 'link',
		source: { title: 'Permit throughput in six mid-sized cities' },
		disposition,
		createdAt: 0,
		decidedAt: disposition === 'undecided' ? null : 1,
	}

	// Every handler supplied: `Check` disables itself when it is given none, and
	// these tests are about what the disposition does rather than that.
	return renderToStaticMarkup(
		createElement(ReferenceCard, {
			offer,
			variant,
			onAccept: () => {},
			onDecline: () => {},
			onRestore: () => {},
		}),
	)
}

describe('the rulings a Chat card offers', () => {
	it('offers both while the Offer is Undecided', () => {
		const html = card('undecided')

		expect(html).toContain('Accept')
		expect(html).toContain('Decline')
	})

	it('offers neither once the Offer is Accepted, and says so', () => {
		const html = card('accepted')

		expect(html).not.toContain('>Accept<')
		expect(html).not.toContain('>Decline<')
		expect(html).toContain('accepted')
	})

	it('offers neither once the Offer is Declined', () => {
		const html = card('declined')

		expect(html).not.toContain('>Accept<')
		expect(html).not.toContain('>Decline<')
		expect(html).toContain('declined')
	})
})

describe('the url a card carries', () => {
	function linked(content: Partial<Offer>) {
		const offer: Offer = {
			id: 'o1',
			type: 'link',
			source: { url: 'https://example.com/permits' },
			disposition: 'undecided',
			createdAt: 0,
			decidedAt: null,
			...content,
		}

		return renderToStaticMarkup(createElement(ReferenceCard, { offer }))
	}

	it('opens in a new tab, so following one does not drop the socket', () => {
		const html = linked({})

		expect(html).toContain('href="https://example.com/permits"')
		expect(html).toContain('target="_blank"')
		expect(html).toContain('rel="noreferrer"')
	})

	it('links the title, where the source carries one', () => {
		const html = linked({
			source: { title: 'Permit throughput', url: 'https://example.com/permits' },
		})

		expect(html).toContain('>Permit throughput</a>')
	})

	// The heading of a Quote is the passage, and underlining a whole passage
	// reads as emphasis rather than as a link.
	it('leaves a passage unlinked, and prints the url under it', () => {
		const html = linked({
			type: 'quote',
			text: 'Forty separate times.',
			source: { url: 'https://example.com/permits' },
		})

		expect(html).toContain('>https://example.com/permits</a>')
		expect(html).not.toContain('>“Forty separate times.”</a>')
	})

	it('draws no anchor where the Reference carries no url', () => {
		expect(linked({ source: { title: 'Permit throughput' } })).not.toContain('<a ')
	})
})

describe('the tick a Ledger card carries', () => {
	// Nothing undoes an Accept — `restoreOffer` undoes a Decline — so the tick
	// does not offer a state to go back to.
	it('is disabled once Accepted', () => {
		expect(card('accepted', 'ledger')).toContain('disabled')
	})

	it('is live while Undecided', () => {
		expect(card('undecided', 'ledger')).not.toContain('disabled')
	})
})
