/**
 * Dates as the index writes them: "4 mar", and "4 mar 2025" once the year stops
 * being this one.
 *
 * The locale is fixed rather than read from the browser, so a story renders the
 * same string on every machine the browser test runs on.
 */

const sameYear = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

const otherYear = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
})

export function shortDate(at: number, now: number = Date.now()): string {
	const date = new Date(at)
	const format = date.getFullYear() === new Date(now).getFullYear() ? sameYear : otherYear

	return format.format(date).toLowerCase()
}
