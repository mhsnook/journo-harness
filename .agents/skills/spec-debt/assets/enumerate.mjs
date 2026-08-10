#!/usr/bin/env node
// Carrier enumeration for the spec-debt audit. Deterministic, no model.
//
//   node enumerate.mjs --paths src/features/review src/lib
//   node enumerate.mjs --diff origin/main...HEAD
//   node enumerate.mjs --all --out /tmp/carriers.json
//
// Emits every comment block that could carry a claim, classified by position,
// plus the three census counts the report needs. This is the whole inventory
// step: it costs no tokens and returns the same answer every run, so no pass
// downstream has to go looking for carriers again.
//
// It does NOT decide what is a claim. A TODO, a section marker, and a
// commented-out line all land in the output; dropping them is Pass A's job,
// and it needs to see them to say so.

import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, extname, basename } from 'node:path'

const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const DOC_EXT = new Set(['.md', '.mdx'])

// Skipped, and reported as skipped — the report has to say what it did not read.
const SKIP_DIR = new Set([
	'node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.turbo',
	'vendor', 'third_party', '__generated__', '.venv', 'venv',
])
const SKIP_FILE = [
	/\.min\.[jt]s$/, /\.d\.ts$/, /-lock\.(json|yaml)$/, /\.generated\./,
	/^supabase\.ts$/,
]

// Absolutes worth counting. `never` and `always` dominate; the rest are the
// same defect wearing different words.
const ABSOLUTES = /\b(never|always|must not|must never|the only way|all cases|every time|guaranteed|impossible)\b/i

// ── Extent ───────────────────────────────────────────────────────────────

function walk(dir, acc = [], skipped = []) {
	let entries
	try {
		entries = readdirSync(dir, { withFileTypes: true })
	} catch {
		return acc
	}
	for (const e of entries) {
		const p = join(dir, e.name)
		if (e.isDirectory()) {
			if (SKIP_DIR.has(e.name)) skipped.push({ path: p, why: 'skipped directory' })
			else walk(p, acc, skipped)
		} else if (e.isFile()) {
			const ext = extname(e.name)
			if (!CODE_EXT.has(ext) && !DOC_EXT.has(ext)) continue
			const bad = SKIP_FILE.find((r) => r.test(e.name))
			if (bad) skipped.push({ path: p, why: 'generated or vendored' })
			else acc.push(p)
		}
	}
	return acc
}

function fromDiff(range) {
	const out = execFileSync('git', ['diff', '--name-only', range], { encoding: 'utf8' })
	return out.split('\n').filter(Boolean).filter((p) => {
		if (!existsSync(p)) return false
		const ext = extname(p)
		return (CODE_EXT.has(ext) || DOC_EXT.has(ext)) && !SKIP_FILE.some((r) => r.test(basename(p)))
	})
}

// ── Comment extraction ───────────────────────────────────────────────────

/**
 * Classify a block by what follows it, which is what decides who reads it.
 * A block at the top of a file orients everyone who opens the file; a block
 * above one function is read only by someone editing that function.
 */
function classify(lines, blockStart, blockEnd, isFirstBlock) {
	// Only the first block in a file can be the header. Without that guard,
	// every block after the import list reads as one, because the check below
	// treats preceding comments as transparent.
	if (isFirstBlock) {
		if (blockStart === 0) return 'file-header'
		let onlyImports = true
		for (let i = 0; i < blockStart; i++) {
			const s = lines[i].trim()
			if (!s) continue
			if (!/^(import|export\s+\*|export\s+\{|'use)/.test(s)) { onlyImports = false; break }
		}
		if (onlyImports) return 'file-header'
	}

	let next = ''
	for (let i = blockEnd + 1; i < lines.length; i++) {
		if (lines[i].trim()) { next = lines[i].trim(); break }
	}
	if (/^(export\s+)?(async\s+)?(function|const|let|class)\b/.test(next)) return 'function-comment'
	if (/^(export\s+)?(type|interface|enum)\b/.test(next)) return 'type-comment'
	if (/^\w+\s*:/.test(next)) return 'type-comment' // a schema or object field
	return 'inline'
}

function extractCode(path) {
	const lines = readFileSync(path, 'utf8').split('\n')
	const blocks = []
	let i = 0
	while (i < lines.length) {
		const s = lines[i].trim()
		if (s.startsWith('//')) {
			const start = i
			const body = []
			while (i < lines.length && lines[i].trim().startsWith('//')) {
				body.push(lines[i].trim().replace(/^\/\/\s?/, ''))
				i++
			}
			blocks.push({ start, end: i - 1, body, style: 'line' })
		} else if (s.startsWith('/*')) {
			const start = i
			const body = []
			while (i < lines.length) {
				body.push(lines[i].trim().replace(/^\/\*+\s?|^\*+\/?\s?|\*\/$/g, '').trim())
				if (lines[i].includes('*/')) { i++; break }
				i++
			}
			blocks.push({ start, end: i - 1, body, style: 'block' })
		} else {
			i++
		}
	}
	return blocks.map((b, idx) => ({
		file: path,
		line: b.start + 1,
		lines: b.end - b.start + 1,
		carrier: classify(lines, b.start, b.end, idx === 0),
		style: b.style,
		text: b.body.filter(Boolean).join(' ').trim(),
		codeLineRatio: codeLineRatio(b.body),
	}))
}

function extractDoc(path) {
	const lines = readFileSync(path, 'utf8').split('\n')
	const out = []
	let inFence = false
	lines.forEach((l, idx) => {
		if (/^\s*```/.test(l)) { inFence = !inFence; return }
		if (inFence) return
		const s = l.trim()
		if (!s) return
		out.push({
			file: path,
			line: idx + 1,
			lines: 1,
			carrier: 'doc',
			style: /^#{1,6}\s/.test(s) ? 'heading'
				: /^[-*]\s+\*\*/.test(s) ? 'bold-lead'
				: 'prose',
			text: s,
			codeLineRatio: 0,
		})
	})
	return out
}

// ── Signals ──────────────────────────────────────────────────────────────

// A claim riding on a heading or a bolded lead-in cannot carry modality, so
// the reader has to guess it. Worth counting separately from prose.
const isHeadingCarrier = (c) => c.style === 'heading' || c.style === 'bold-lead'

// A HINT, not a verdict. Pass A still reads the text — these only let the
// report say how much of the inventory is cheap to discard.
//
// `commented-out code` needs a terminator, not a leading keyword and not a
// trailing bracket. A bare `if` flagged five prose comments in one folder
// ("if the entry is undefined, it means we haven't reviewed this card yet"),
// and a trailing `)` flagged eight more ("FSRS v5 weights (pre-trained
// parameters)") — prose parenthesises constantly but almost never ends in a
// semicolon. A false positive here means Pass A skips a real claim.
// Measured per LINE, not over the joined text: a two-line commented-out block
// whose last line ends in `)` has a semicolon on the first one.
// Prose uses semicolons and parentheses too. "A static override (the /themes
// showcase) renders the picker without auth;" matched every syntax rule tried
// here, so the discriminator is English: code lines carry almost no stopwords.
const CODE_SHAPE = /;\s*$|[{}]\s*$|=>/
const STOPWORD = /\b(the|a|an|so|is|are|we|it|its|this|that|and|but|for|to|of|in|on|when|if|because|otherwise|would|will|not|no)\b/gi
const looksLikeProse = (line) => (line.match(STOPWORD) ?? []).length >= 2

const codeLineRatio = (bodyLines) => {
	const real = bodyLines.filter((l) => l.trim())
	if (!real.length) return 0
	const code = real.filter((l) => CODE_SHAPE.test(l) && !looksLikeProse(l))
	return code.length / real.length
}

const NOT_A_CLAIM = [
	{ name: 'todo', re: /^(TODO|FIXME|XXX|HACK)\b[:\s]/i },
	{ name: 'lint directive', re: /^(eslint|oxlint|prettier|ts-|@ts-|biome|c8|istanbul)-?(disable|expect|ignore)/ },
	{ name: 'section marker', re: /^[─=—*#\-\s]{6,}$|^[─=—\s]*[A-Z][\w\s&]{2,30}[─=—\s]*$/ },
	{ name: 'bare url or ref', re: /^(https?:\/\/|see\s+https?:\/\/|#\d+$|PR\s*#?\d+$)/i },
]

/**
 * A HINT with no false positives as its design goal. Some commented-out code
 * will be missed, which costs Pass A one read; a misflagged claim costs a
 * claim, so the threshold is deliberately high.
 */
const notAClaim = (text, ratio) => {
	const hit = NOT_A_CLAIM.find((n) => n.re.test(text))
	if (hit) return hit.name
	return ratio >= 0.5 ? 'commented-out code' : null
}

function main() {
	const argv = process.argv.slice(2)
	const outIdx = argv.indexOf('--out')
	const out = outIdx >= 0 ? argv[outIdx + 1] : null
	const skipped = []
	let files = []
	let extent

	if (argv.includes('--diff')) {
		const range = argv[argv.indexOf('--diff') + 1]
		extent = { kind: 'diff', range }
		files = fromDiff(range)
	} else if (argv.includes('--paths')) {
		const start = argv.indexOf('--paths') + 1
		const paths = []
		for (let i = start; i < argv.length && !argv[i].startsWith('--'); i++) paths.push(argv[i])
		extent = { kind: 'paths', paths }
		for (const p of paths) {
			if (!existsSync(p)) continue
			if (statSync(p).isDirectory()) walk(p, files, skipped)
			else files.push(p)
		}
	} else {
		extent = { kind: 'all', paths: ['.'] }
		walk('.', files, skipped)
	}

	files = [...new Set(files)].sort()
	const carriers = []
	for (const f of files) {
		try {
			carriers.push(...(DOC_EXT.has(extname(f)) ? extractDoc(f) : extractCode(f)))
		} catch (e) {
			skipped.push({ path: f, why: `unreadable: ${e.message}` })
		}
	}

	// Tag rather than drop: Pass A decides, and it needs to see these to say so.
	for (const c of carriers) {
		c.likelyNotAClaim = notAClaim(c.text, c.codeLineRatio)
		const m = c.text.match(ABSOLUTES)
		c.absolute = m ? m[1].toLowerCase() : null
	}

	const code = carriers.filter((c) => c.carrier !== 'doc')
	const byCarrier = {}
	for (const c of carriers) byCarrier[c.carrier] = (byCarrier[c.carrier] || 0) + 1
	const absolutes = {}
	for (const c of carriers) if (c.absolute) absolutes[c.absolute] = (absolutes[c.absolute] || 0) + 1
	const notClaims = {}
	for (const c of carriers) if (c.likelyNotAClaim) notClaims[c.likelyNotAClaim] = (notClaims[c.likelyNotAClaim] || 0) + 1

	const filesWithoutHeader = files
		.filter((f) => !DOC_EXT.has(extname(f)))
		.filter((f) => !carriers.some((c) => c.file === f && c.carrier === 'file-header'))

	const report = {
		extent,
		coverage: { filesRead: files.length, skipped },
		census: {
			carriers: carriers.length,
			byCarrier,
			codeBlocks: code.length,
			longBlocks5: code.filter((c) => c.lines >= 5).length,
			longBlocks8: code.filter((c) => c.lines >= 8).length,
			absolutes,
			absolutesTotal: Object.values(absolutes).reduce((a, b) => a + b, 0),
			headingCarriers: carriers.filter(isHeadingCarrier).length,
			likelyNotClaims: notClaims,
			likelyNotClaimsTotal: Object.values(notClaims).reduce((a, b) => a + b, 0),
			filesWithoutHeader: filesWithoutHeader.length,
		},
		filesWithoutHeader,
		carriers,
	}

	if (out) {
		writeFileSync(out, JSON.stringify(report, null, 2))
	}

	const c = report.census
	const summary = [
		`extent: ${extent.kind}${extent.range ? ` ${extent.range}` : ''} — ${files.length} file(s) read, ${skipped.length} skipped`,
		`carriers: ${c.carriers} (${Object.entries(byCarrier).map(([k, v]) => `${k} ${v}`).join(', ')})`,
		`long code blocks: ${c.longBlocks5} at >=5 lines, ${c.longBlocks8} at >=8`,
		`absolutes: ${c.absolutesTotal}${c.absolutesTotal ? ` (${Object.entries(absolutes).map(([k, v]) => `${k} ${v}`).join(', ')})` : ''}`,
		`claims riding on a heading: ${c.headingCarriers}`,
		`likely not claims: ${c.likelyNotClaimsTotal}${c.likelyNotClaimsTotal ? ` (${Object.entries(notClaims).map(([k, v]) => `${k} ${v}`).join(', ')})` : ''}`,
		`code files with no header comment: ${c.filesWithoutHeader}`,
	]
	console.error(summary.join('\n'))
	if (out) console.error(`\nwrote ${out}`)
	else console.log(JSON.stringify(report, null, 2))
}

main()
