'use strict'

// Turn two directories of collected static-check output into markdown
// fragments plus a gate sidecar. Section order comes from the numeric filename
// prefix, so fragments render consistently whatever order the jobs finish in.

const fs = require('fs')
const path = require('path')
const {
	parsers,
	differential,
	readLines,
	countSummary,
	listBlock,
	byExtension,
} = require('./delta.cjs')

// CONFIGURE: how many issues to print before collapsing to "… and N more".
const CAP = 50

module.exports = function render({ head, base, out }) {
	fs.mkdirSync(out, { recursive: true })
	const write = (name, markdown, gate) => {
		fs.writeFileSync(path.join(out, `${name}.md`), markdown)
		fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify(gate, null, 2))
	}

	// ── Type errors ──────────────────────────────────────────────────────
	const tc = differential(
		readLines(`${base}/typecheck.txt`),
		readLines(`${head}/typecheck.txt`),
		parsers.tsc
	)
	write(
		'10-typecheck',
		[
			'#### Type errors',
			'',
			countSummary(tc, 'error(s)'),
			listBlock('New', tc.added, CAP),
			listBlock('Resolved', tc.resolved, CAP),
		]
			.filter((l) => l !== null)
			.join('\n'),
		{ check: 'typecheck', new: tc.added.length, resolved: tc.resolved.length, total: tc.head }
	)

	// ── Lint ─────────────────────────────────────────────────────────────
	const lint = differential(
		readLines(`${base}/lint.txt`),
		readLines(`${head}/lint.txt`),
		parsers.unix
	)
	write(
		'20-lint',
		[
			'#### Lint',
			'',
			countSummary(lint, 'issue(s)'),
			listBlock('New', lint.added, CAP),
			listBlock('Resolved', lint.resolved, CAP),
		]
			.filter((l) => l !== null)
			.join('\n'),
		{ check: 'lint', new: lint.added.length, resolved: lint.resolved.length, total: lint.head }
	)

	// ── Formatter drift ──────────────────────────────────────────────────
	// The unit is the file, not the line, so shift-pairing is switched off.
	const headFiles = readLines(`${head}/format.txt`)
	const fmt = differential(readLines(`${base}/format.txt`), headFiles, parsers.file, 0)
	const ext = byExtension(headFiles)
	write(
		'30-format',
		[
			'#### Formatter drift',
			'',
			'Files the formatter would still rewrite — debt to drive toward **0** by reformatting legacy files as you touch them.',
			'',
			countSummary(fmt, 'file(s)', { showTrend: true }),
			ext.length ? '\n**By type:** ' + ext.map(([e, n]) => `\`${e}\` ${n}`).join(' · ') : null,
			listBlock('Newly unformatted', fmt.added, CAP),
			listBlock('Reformatted', fmt.resolved, CAP),
		]
			.filter((l) => l !== null)
			.join('\n'),
		{ check: 'format', new: fmt.added.length, resolved: fmt.resolved.length, total: fmt.head }
	)
}
