/** Dates as a list shows them: "4 mar", and "4 mar 2025" outside this year. The
 * locale is fixed so a story renders the same string on every machine. */

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
