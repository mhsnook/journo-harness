'use strict'

// The one place the pass/fail policy lives.
//
// Reporting and gating are deliberately separate: the comment always posts, so
// a contributor can see the full picture even on a red build. This step then
// decides, from the same numbers, whether the build should fail.

const fs = require('fs')
const path = require('path')

// CONFIGURE: strictness per check.
//   'report-only'      never fails — the comment is the whole point
//   'no-new'           fails when this PR adds any issue of this kind
//   { maxNew: N }      allows up to N new issues
//   { maxTotal: N }    fails on the absolute count, ignoring the delta
//   { maxGzDelta: N }  bundle only — fails when gzipped bytes grow by over N
const POLICY = {
	typecheck: 'no-new',
	lint: 'no-new',
	format: 'report-only',
	tests: 'no-new',
	bundle: { maxGzDelta: 10 * 1024 },
}

function verdict(check, data) {
	const rule = POLICY[check] ?? 'report-only'
	if (rule === 'report-only') return null

	// A step that produced no measurement did not pass — it crashed. Treat the
	// absence as a failure for every gated check, or a broken build reads as
	// "no change" and merges clean.
	if (data.missing) return 'the step produced no measurement (crashed or was skipped)'

	if (check === 'tests') {
		return data.failed > 0 ? `${data.failed} failing test(s)` : null
	}

	if (check === 'bundle') {
		const limit = rule.maxGzDelta ?? Infinity
		const grew = data.eagerGzDelta ?? 0
		return grew > limit ?
				`eager bundle grew ${(grew / 1024).toFixed(2)} kB gzipped, over the ${(limit / 1024).toFixed(0)} kB budget`
			:	null
	}

	if (rule === 'no-new') {
		return data.new > 0 ? `${data.new} new issue(s)` : null
	}
	if (typeof rule.maxNew === 'number') {
		return data.new > rule.maxNew ?
				`${data.new} new issue(s), over the limit of ${rule.maxNew}`
			:	null
	}
	if (typeof rule.maxTotal === 'number') {
		return data.total > rule.maxTotal ?
				`${data.total} total issue(s), over the limit of ${rule.maxTotal}`
			:	null
	}
	return null
}

function main(dir) {
	if (!fs.existsSync(dir)) {
		console.error(`No fragments at ${dir} — every check job failed before reporting.`)
		process.exit(1)
	}

	const sidecars = fs
		.readdirSync(dir, { recursive: true })
		.filter((f) => typeof f === 'string' && f.endsWith('.json'))
		.sort()

	const failures = []
	for (const f of sidecars) {
		const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
		const reason = verdict(data.check, data)
		if (reason) failures.push(`${data.check}: ${reason}`)
		else if ((POLICY[data.check] ?? 'report-only') === 'report-only')
			console.log(`➖ ${data.check} (report only, not gated)`)
		else console.log(`✅ ${data.check}`)
	}

	if (!failures.length) {
		console.log('\nAll gated checks passed.')
		return
	}
	console.error('\nBlocking:')
	for (const f of failures) console.error(`  ❌ ${f}`)
	console.error('\nSee the "### PR checks" comment on the pull request for detail.')
	process.exit(1)
}

if (require.main === module) main(process.argv[2] ?? '/tmp/fragments')

module.exports = { POLICY, verdict }
