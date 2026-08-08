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
